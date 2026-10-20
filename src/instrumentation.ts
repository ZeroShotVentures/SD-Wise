export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { syncAdminRoles } = await import("./lib/admin-role");
    // Next keeps a failed register() for the life of the server and fails
    // every request with it, so one database error here would take the site
    // down until the next deploy. Roles live in the database, so the next
    // server to start applies them.
    await syncAdminRoles().catch((error) => {
      console.error("Couldn't sync admin roles from ADMIN_EMAILS", error);
    });
  }
}
