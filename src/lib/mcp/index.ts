import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyPosts from "./tools/list-my-posts";
import listMyNotifications from "./tools/list-my-notifications";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "primegram",
  title: "primegram",
  version: "0.1.0",
  instructions: "Tools for Primegram. Read the signed-in user's profile, posts and notifications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyPosts, listMyNotifications],
});
