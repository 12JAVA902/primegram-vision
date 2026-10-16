import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const scopeLabel = (s: string) =>
  s === "openid" ? "Confirm your identity" : s === "email" ? "Share your email address" : s === "profile" ? "Share your basic profile" : `Additional permission requested: ${s}`;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!authorizationId) return setError("This connection request is missing or invalid.");
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          const next = window.location.pathname + window.location.search;
          window.location.href = "/auth?next=" + encodeURIComponent(next);
          return;
        }
        setEmail(sess.session.user.email ?? sess.session.user.phone ?? null);
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Something went wrong.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) throw new Error(error.message);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error("No redirect was returned.");
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(`${approve ? "Approval" : "Cancelling"} failed: ${e?.message ?? "unknown error"}`);
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "An app";
  const scopes: string[] = String(details?.scope ?? details?.scopes ?? "").split(/[\s,]+/).filter(Boolean);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {error ? (
          <CardHeader>
            <CardTitle>Could not load this request</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        ) : !details ? (
          <CardContent className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Connect {clientName} to Primegram</CardTitle>
              <CardDescription>
                {clientName} will be able to read your profile, posts and notifications as you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {email && <p>Signed in as <span className="font-medium">{email}</span></p>}
              {details?.redirect_uri && <p className="text-muted-foreground break-all">Returns to: {details.redirect_uri}</p>}
              {scopes.length > 0 && (
                <ul className="list-disc pl-5 space-y-1">{scopes.map((s) => <li key={s}>{scopeLabel(s)}</li>)}</ul>
              )}
              <p className="text-muted-foreground">This does not bypass Primegram's permissions.</p>
              <div className="flex gap-2">
                <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Approve</Button>
                <Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
