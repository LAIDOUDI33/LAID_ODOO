// ============================================================
// HASSIBA Suite ERP v2.0.0 - NextAuth.js API Route
// Authentication Endpoint
// ============================================================

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
