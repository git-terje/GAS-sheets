
function svcGetStock(dispId) {
  const central = getTable("CentralStock").filter(r => r.dispId === dispId);
  const local = getTable("DispensaryStock").filter(r => r.dispId === dispId);
  const packaging = getTable("PackagingStock").filter(r => r.dispId === dispId);
  return { central, local, packaging };
}

function svcGetStock(dispId) {
  const central = getTable("CentralStock").filter(r => r.dispId === dispId);
  const local = getTable("DispensaryStock").filter(r => r.dispId === dispId);
  const packaging = getTable("PackagingStock").filter(r => r.dispId === dispId);
  return { central, local, packaging };
}

function svcSubmitOrder(uid, po) {
  po.status = "submitted";
  po.submitTs = new Date();
  po.submitBy = uid;
  appendRow("PurchaseOrders", po);
}
function svcGetPOs(role, uid) {
  let rows = getTable("PurchaseOrders");
  if (role === "disp") rows = rows.filter(r => r.submitBy === uid);
  return rows;
}

function svcMarkPOready(id) {
  updateRow("PurchaseOrders", id, { status: "ready" });
}

function svcApprovePO(id) {
  updateRow("PurchaseOrders", id, { status: "approved" });
}

function svcMarkPOreceived(id) {
  updateRow("PurchaseOrders", id, { status: "received" });
}

function svcGetPOs(role, uid) {
  let rows = getTable("PurchaseOrders");
  if (role === "disp") rows = rows.filter(r => r.submitBy === uid);
  return rows;
}

