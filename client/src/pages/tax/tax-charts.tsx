import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function QuarterAreaChart({ chartQuarterData, isAr }: { chartQuarterData: any[]; isAr: boolean }) {
  return (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartQuarterData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(16px)",
                    borderRadius: "1rem",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, name: string) => [
                    `${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR`,
                    name === "sales"
                      ? isAr ? "المبيعات" : "Sales"
                      : name === "purchases"
                      ? isAr ? "المشتريات" : "Purchases"
                      : isAr ? "صافي الضريبة" : "Net VAT",
                  ]}
                  labelFormatter={(label) => `${label} - ${isAr ? "البيانات المالية" : "Financials"}`}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
                <Area
                  type="monotone"
                  dataKey="purchases"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPurchases)"
                />
                <Area
                  type="monotone"
                  dataKey="netVat"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNet)"
                />
              </AreaChart>
            </ResponsiveContainer>
  );
}

export function ZakatPieChart({ chartPieData }: { chartPieData: { name: string; value: number; color: string }[] }) {
  return (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        backdropFilter: "blur(16px)",
                        borderRadius: "0.75rem",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#fff",
                        fontSize: "11px",
                      }}
                      formatter={(val: any) => [`${Number(val).toLocaleString()} SAR`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
  );
}
