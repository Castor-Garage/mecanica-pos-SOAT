#!/usr/bin/env python3
"""Gera carga real na API criando ordens de servico em paralelo, para demonstrar
o HPA escalando (kubectl -n castor-garage get hpa -w) durante a gravacao do video.

Uso:
    python scripts/load_test_create_orders.py
    python scripts/load_test_create_orders.py --workers 30 --duration 120

Criar OS sozinho costuma nao gerar CPU suficiente pra estourar o threshold do HPA
(e I/O-bound, dominado pelas queries no Postgres). Para forcar o escalonamento,
some --login-workers: cada chamada de /auth/login roda bcrypt.compare (bcryptjs,
implementacao pura em JS), que e sincrono e bem mais pesado de CPU:
    python scripts/load_test_create_orders.py --workers 20 --login-workers 30

So usa a biblioteca padrao do Python (sem dependencias externas).
Requer: banco seedado (npm run db:seed) e API respondendo em --base-url.
"""

import argparse
import json
import os
import random
import threading
import time
import urllib.error
import urllib.request
from collections import Counter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("BASE_URL", "http://localhost:30080"))
    parser.add_argument("--email", default=os.environ.get("ADMIN_EMAIL", "admin@oficina.com"))
    parser.add_argument("--password", default=os.environ.get("ADMIN_PASSWORD", "Admin@123"))
    parser.add_argument("--workers", type=int, default=int(os.environ.get("WORKERS", "20")))
    parser.add_argument("--duration", type=int, default=int(os.environ.get("DURATION", "90")))
    parser.add_argument(
        "--login-workers",
        type=int,
        default=int(os.environ.get("LOGIN_WORKERS", "0")),
        help="Threads extras martelando POST /auth/login (bcrypt e sincrono, gera bem mais CPU que criar OS).",
    )
    return parser.parse_args()


def request_json(url: str, method: str = "GET", body: dict | None = None, token: str | None = None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def login(base_url: str, email: str, password: str) -> str:
    print(f"==> Autenticando em {base_url} ...")
    try:
        _, payload = request_json(f"{base_url}/auth/login", "POST", {"email": email, "password": password})
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise SystemExit(
            f"Falha no login ({e.code}): {detail}\n"
            "Rode 'npm run db:seed' (apontando o DATABASE_URL pro banco do cluster) antes de gerar carga."
        )
    token = payload.get("token")
    if not token:
        raise SystemExit(f"Login nao retornou token: {payload}")
    return token


def build_order_bodies(base_url: str, token: str) -> list[dict]:
    print("==> Buscando clientes, veiculos, servicos e pecas cadastrados...")
    _, clients = request_json(f"{base_url}/clients?perPage=100", token=token)
    _, vehicles = request_json(f"{base_url}/vehicles?perPage=100", token=token)
    _, services = request_json(f"{base_url}/services?perPage=100&onlyActive=true", token=token)
    _, parts = request_json(f"{base_url}/parts?perPage=100&onlyActive=true", token=token)

    client_ids = {c["id"] for c in clients.get("data", [])}
    valid_vehicles = [v for v in vehicles.get("data", []) if v["clientId"] in client_ids]
    service_list = services.get("data", [])
    part_list = parts.get("data", [])

    if not valid_vehicles or not service_list:
        raise SystemExit('Sem clientes/veiculos/servicos suficientes - rode "npm run db:seed" primeiro.')

    bodies = []
    for vehicle in valid_vehicles:
        service = random.choice(service_list)
        body = {
            "clientId": vehicle["clientId"],
            "vehicleId": vehicle["id"],
            "problemDescription": "Carga de teste - demonstracao de escalabilidade automatica",
            "services": [{"serviceId": service["id"], "quantity": 1}],
        }
        if part_list and random.random() > 0.5:
            part = random.choice(part_list)
            body["parts"] = [{"partId": part["id"], "quantity": 1}]
        bodies.append(body)

    print(f"==> {len(bodies)} combinacoes validas de cliente/veiculo prontas para uso.")
    return bodies


def worker(base_url: str, token: str, bodies: list[dict], stop_at: float, results: Counter, lock: threading.Lock):
    while time.monotonic() < stop_at:
        body = random.choice(bodies)
        try:
            status, _ = request_json(f"{base_url}/service-orders", "POST", body, token=token)
        except urllib.error.HTTPError as e:
            status = e.code
        except Exception:
            status = "erro_conexao"
        with lock:
            results[status] += 1


def login_worker(base_url: str, email: str, password: str, stop_at: float, results: Counter, lock: threading.Lock):
    body = {"email": email, "password": password}
    while time.monotonic() < stop_at:
        try:
            status, _ = request_json(f"{base_url}/auth/login", "POST", body)
        except urllib.error.HTTPError as e:
            status = e.code
        except Exception:
            status = "erro_conexao"
        with lock:
            results[f"login:{status}"] += 1


def main() -> None:
    args = parse_args()
    token = login(args.base_url, args.email, args.password)
    bodies = build_order_bodies(args.base_url, token)

    print(
        f"==> Disparando {args.workers} workers em paralelo por {args.duration}s "
        "criando ordens de servico (POST /service-orders)..."
    )
    if args.login_workers > 0:
        print(f"    + {args.login_workers} workers extras martelando POST /auth/login (gera CPU via bcrypt)")
    print("    Acompanhe em outro terminal: kubectl --context kind-castor-garage -n castor-garage get hpa -w\n")

    results: Counter = Counter()
    lock = threading.Lock()
    stop_at = time.monotonic() + args.duration

    threads = [
        threading.Thread(target=worker, args=(args.base_url, token, bodies, stop_at, results, lock), daemon=True)
        for _ in range(args.workers)
    ]
    threads += [
        threading.Thread(
            target=login_worker,
            args=(args.base_url, args.email, args.password, stop_at, results, lock),
            daemon=True,
        )
        for _ in range(args.login_workers)
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    print("==> Carga finalizada. Resultado por status HTTP:")
    for status, count in results.most_common():
        print(f"    {count:6d}  {status}")

    _, stats = request_json(f"{args.base_url}/service-orders?perPage=1&status=RECEBIDA", token=token)
    print(f"\n==> Total de ordens de servico com status RECEBIDA agora no banco: {stats['meta']['total']}")


if __name__ == "__main__":
    main()
