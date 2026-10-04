/** Explicit schema targeting for isolated checks and verified production TLS. */
export function databaseTarget(connectionString: string, production: boolean) {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("PostgreSQL URL required");
  const schema = url.searchParams.get("schema") || "public";
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error("Invalid database schema");
  url.searchParams.delete("schema");
  // Raw SQL in transactions must use the same schema as adapter-generated SQL.
  if (schema !== "public") url.searchParams.set("options", `-c search_path=${schema}`);
  if (production) {
    url.searchParams.set("sslmode", "verify-full");
    url.searchParams.delete("uselibpqcompat");
    url.searchParams.delete("sslnegotiation");
  }
  return { connectionString: url.href, schema };
}
