
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

