import { connection, NextRequest, NextResponse } from "next/server";
import {
  fetchBackendAuthMe,
  mapBackendAuthMeResponse,
} from "@/lib/auth/backend-auth";
import {
  createLoggedOutAuthMeResponse,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/telegram-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await connection();

  try {
    const authMe = await fetchBackendAuthMe(request);
    const response = NextResponse.json(mapBackendAuthMeResponse(authMe));

    if (!authMe.isLoggedIn) {
      response.cookies.delete({ name: SESSION_COOKIE_NAME, path: "/" });
    }

    return response;
  } catch {
    const response = NextResponse.json(createLoggedOutAuthMeResponse());
    response.cookies.delete({ name: SESSION_COOKIE_NAME, path: "/" });
    return response;
  }
}
