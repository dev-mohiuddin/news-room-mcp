import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Save, Shield, Bell, Globe, User } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/shared/PageHeader";
import GlassCard from "@/components/shared/GlassCard";
import GradientButton from "@/components/shared/GradientButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  fetchMyProfile,
  saveProfile,
  savePassword,
  saveNotifications,
  saveWorkspace,
} from "@/redux/slice/user-slice";
import { setUser } from "@/redux/slice/auth-slice";

/**
 * Settings page — fully wired to /api/v1/user/*.
 *
 *   - Profile     → PATCH /user/profile      (name, timezone, language)
 *   - Security    → PUT   /user/password     (currentPassword + newPassword)
 *   - Notifications → PATCH /user/notifications (5 boolean toggles)
 *   - Workspace   → PATCH /user/workspace    (workspace name; owner only)
 */

const NOTIFICATION_ROWS = [
  {
    key: "emailArticleReady",
    inappKey: "inappArticleReady",
    label: "Article generation complete",
  },
  {
    key: "emailFailures",
    inappKey: "inappFailures",
    label: "Pipeline failures & errors",
  },
  {
    key: "emailWeeklyDigest",
    inappKey: null,
    label: "Weekly digest",
  },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "US Eastern (NY)" },
  { value: "America/Los_Angeles", label: "US Pacific (LA)" },
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Europe/Berlin", label: "CET (Berlin)" },
  { value: "Asia/Tokyo", label: "JST (Tokyo)" },
  { value: "Asia/Dhaka", label: "BST (Dhaka)" },
  { value: "Asia/Kolkata", label: "IST (Kolkata)" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "ja", label: "日本語" },
  { value: "bn", label: "বাংলা" },
];

export default function UserSettingsPage() {
  const dispatch = useDispatch();
  const { profile, workspace, isLoading } = useSelector((s) => s.user);
  const currentUser = useSelector((s) => s.auth.user);

  /* Local form state — hydrated from `profile` once it arrives */
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState("en");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const [notifications, setNotifications] = useState({});
  const [workspaceName, setWorkspaceName] = useState("");

  const [savingTab, setSavingTab] = useState(null);

  useEffect(() => {
    dispatch(fetchMyProfile());
  }, [dispatch]);

  /* Hydrate local fields whenever the profile / workspace doc updates */
  useEffect(() => {
    if (!profile) return;
    setName(profile.name || "");
    setTimezone(profile.preferences?.timezone || "UTC");
    setLanguage(profile.preferences?.language || "en");
    setNotifications(profile.preferences?.notifications || {});
  }, [profile]);

  useEffect(() => {
    if (!workspace) return;
    setWorkspaceName(workspace.name || "");
  }, [workspace]);

  const isOwner = useMemo(
    () => currentUser?.role === "workspace_owner" || currentUser?.role === "super_admin",
    [currentUser]
  );

  /* ── Save handlers ─────────────────────────────────────── */

  const handleProfileSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSavingTab("profile");
    const res = await dispatch(
      saveProfile({ name: name.trim(), timezone, language })
    );
    setSavingTab(null);
    if (saveProfile.fulfilled.match(res)) {
      toast.success("Profile saved");
      /* Keep the auth-slice copy in sync so navbar avatar/name update */
      if (currentUser) {
        dispatch(setUser({ ...currentUser, name: name.trim() }));
      }
    } else {
      toast.error(res.payload || "Could not save profile");
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setIsChangingPwd(true);
    const res = await dispatch(
      savePassword({ currentPassword, newPassword })
    );
    setIsChangingPwd(false);
    if (savePassword.fulfilled.match(res)) {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      toast.error(res.payload || "Could not change password");
    }
  };

  const toggleNotif = async (key, value) => {
    /* Optimistic — flip locally, then persist; rollback on failure */
    const prev = notifications;
    const next = { ...prev, [key]: value };
    setNotifications(next);
    setSavingTab("notifications");
    const res = await dispatch(saveNotifications({ [key]: value }));
    setSavingTab(null);
    if (!saveNotifications.fulfilled.match(res)) {
      setNotifications(prev);
      toast.error(res.payload || "Could not update notifications");
    }
  };

  const handleWorkspaceSave = async () => {
    if (!workspaceName.trim()) {
      toast.error("Workspace name cannot be empty");
      return;
    }
    setSavingTab("workspace");
    const res = await dispatch(saveWorkspace({ name: workspaceName.trim() }));
    setSavingTab(null);
    if (saveWorkspace.fulfilled.match(res)) {
      toast.success("Workspace updated");
    } else {
      toast.error(res.payload || "Could not update workspace");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Profile, security, notifications, and workspace preferences."
      />

      {isLoading && !profile ? (
        <p className="text-sm text-muted-foreground">Loading your settings…</p>
      ) : (
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-3.5 w-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="workspace" className="gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Workspace
            </TabsTrigger>
          </TabsList>

          {/* ── Profile ── */}
          <TabsContent value="profile">
            <GlassCard className="p-6 space-y-5 max-w-3xl">
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center text-white text-3xl font-display shadow-lg">
                  {(profile?.name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.email}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mt-1">
                    {profile?.roleDisplayName || profile?.role}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Full name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    value={profile?.email || ""}
                    readOnly
                    disabled
                    className="mt-1.5 opacity-60 cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Timezone
                  </Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Language
                  </Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <GradientButton
                  size="md"
                  onClick={handleProfileSave}
                  disabled={savingTab === "profile"}
                >
                  <Save className="h-4 w-4" />
                  {savingTab === "profile" ? "Saving…" : "Save changes"}
                </GradientButton>
              </div>
            </GlassCard>
          </TabsContent>

          {/* ── Security ── */}
          <TabsContent value="security">
            <GlassCard className="p-6 space-y-6 max-w-3xl">
              <Section title="Change password">
                {profile?.authProvider === "google" ? (
                  <p className="text-xs text-muted-foreground">
                    You signed in with Google. To set a password, use the
                    "Forgot password" flow on the login page first.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                          Current password
                        </Label>
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="mt-1.5"
                        />
                      </div>
                      <div />
                      <div>
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                          New password
                        </Label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                          Confirm new password
                        </Label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <Button
                      variant="glass"
                      size="sm"
                      className="mt-3"
                      onClick={handlePasswordChange}
                      disabled={isChangingPwd}
                    >
                      {isChangingPwd ? "Updating…" : "Update password"}
                    </Button>
                  </>
                )}
              </Section>

              <Section title="Two-factor authentication">
                <div className="flex items-center justify-between p-4 rounded-lg glass border border-white/5">
                  <div>
                    <p className="text-sm font-medium">Enable 2FA</p>
                    <p className="text-xs text-muted-foreground">
                      Coming soon — TOTP authenticator support is in our
                      roadmap.
                    </p>
                  </div>
                  <Switch disabled />
                </div>
              </Section>
            </GlassCard>
          </TabsContent>

          {/* ── Notifications ── */}
          <TabsContent value="notifications">
            <GlassCard className="p-6 space-y-3 max-w-3xl">
              <p className="text-xs text-muted-foreground mb-2">
                Choose how you want to be notified for each event type.
                Changes save automatically.
              </p>
              {NOTIFICATION_ROWS.map((row) => (
                <NotifRow
                  key={row.label}
                  row={row}
                  values={notifications}
                  saving={savingTab === "notifications"}
                  onChange={toggleNotif}
                />
              ))}
            </GlassCard>
          </TabsContent>

          {/* ── Workspace ── */}
          <TabsContent value="workspace">
            <GlassCard className="p-6 space-y-5 max-w-3xl">
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Workspace name
                </Label>
                <Input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="mt-1.5"
                  disabled={!isOwner}
                />
                {!isOwner && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Only the workspace owner can rename the workspace.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Workspace slug
                </Label>
                <Input
                  value={workspace?.slug || ""}
                  readOnly
                  disabled
                  className="mt-1.5 opacity-60 cursor-not-allowed"
                />
              </div>

              {isOwner && (
                <div className="flex justify-end">
                  <GradientButton
                    size="md"
                    onClick={handleWorkspaceSave}
                    disabled={savingTab === "workspace"}
                  >
                    <Save className="h-4 w-4" />
                    {savingTab === "workspace" ? "Saving…" : "Save changes"}
                  </GradientButton>
                </div>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-display text-lg mb-3">{title}</h3>
      {children}
    </div>
  );
}

function NotifRow({ row, values, saving, onChange }) {
  const emailValue = !!values?.[row.key];
  const inappValue = row.inappKey ? !!values?.[row.inappKey] : false;
  return (
    <div className="flex items-center justify-between p-3 rounded-lg glass border border-white/5">
      <p className="text-sm flex-1">{row.label}</p>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <Switch
            checked={emailValue}
            onCheckedChange={(v) => onChange(row.key, v)}
            disabled={saving}
          />
          Email
        </label>
        {row.inappKey && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <Switch
              checked={inappValue}
              onCheckedChange={(v) => onChange(row.inappKey, v)}
              disabled={saving}
            />
            In-app
          </label>
        )}
      </div>
    </div>
  );
}
