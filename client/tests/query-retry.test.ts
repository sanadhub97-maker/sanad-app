import { expect, it } from "vitest";
import { shouldRetryQuery } from "../src/lib/query-retry";
it("does not repeat denied or invalid requests",()=>{for(const status of [400,401,403,404,422])expect(shouldRetryQuery(0,{response:{status}})).toBe(false)});
it("retries network and server failures once",()=>{expect(shouldRetryQuery(0,new Error("offline"))).toBe(true);expect(shouldRetryQuery(0,{response:{status:503}})).toBe(true);expect(shouldRetryQuery(1,{response:{status:503}})).toBe(false)});
