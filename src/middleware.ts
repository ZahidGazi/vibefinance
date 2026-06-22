export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/subscriptions/:path*", "/cash-flow/:path*", "/renewals/:path*"],
};
