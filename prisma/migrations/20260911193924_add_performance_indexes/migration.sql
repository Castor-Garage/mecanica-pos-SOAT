-- CreateIndex
CREATE INDEX "vehicles_client_id_idx" ON "vehicles"("client_id");

-- CreateIndex
CREATE INDEX "service_orders_client_id_idx" ON "service_orders"("client_id");

-- CreateIndex
CREATE INDEX "service_orders_vehicle_id_idx" ON "service_orders"("vehicle_id");

-- CreateIndex
CREATE INDEX "service_orders_status_idx" ON "service_orders"("status");

-- CreateIndex
CREATE INDEX "service_orders_created_at_idx" ON "service_orders"("created_at");

-- CreateIndex
CREATE INDEX "service_order_items_service_order_id_idx" ON "service_order_items"("service_order_id");

-- CreateIndex
CREATE INDEX "service_order_items_service_id_idx" ON "service_order_items"("service_id");

-- CreateIndex
CREATE INDEX "service_order_parts_service_order_id_idx" ON "service_order_parts"("service_order_id");

-- CreateIndex
CREATE INDEX "service_order_parts_part_id_idx" ON "service_order_parts"("part_id");

-- CreateIndex
CREATE INDEX "os_status_history_service_order_id_changed_at_idx" ON "os_status_history"("service_order_id", "changed_at");
