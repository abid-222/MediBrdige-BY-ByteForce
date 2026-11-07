"use client";
import { useState } from "react";
import { api, getToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Input, Select } from "@/components/ui";

export default function Apply() {
  const { t } = useI18n();
  const [role, setRole] = useState("doctor"); const [name, setName] = useState(""); const [ev, setEv] = useState("");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    try {
      await api("/auth/role-applications", { body: { requested_role: role, details: role === "doctor" ? { full_name: name } : { facility_name: name }, evidence_refs: ev ? [ev] : [] } });
      setMsg(t("auth.pending"));
    } catch (e: any) { setErr(getToken() ? e.message : "Create an account and log in first."); }
  };
  return (
    <Card className="mx-auto mt-6 max-w-md space-y-4 md:mt-12">
      <h1 className="text-2xl">{t("auth.apply")}</h1>
      <form onSubmit={submit} className="space-y-3">
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}><option value="doctor">Doctor</option><option value="facility_admin">Hospital / clinic</option></Select>
        <Input label={role === "doctor" ? t("auth.fullName") : "Facility name"} value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label={t("adm.evidence")} value={ev} onChange={(e) => setEv(e.target.value)} />
        {err && <p role="alert" className="text-sm text-danger">⚠ {err}</p>}
        {msg && <p role="status" className="text-sm text-ptext">{msg}</p>}
        <Button className="w-full">{t("common.submit")}</Button>
      </form>
    </Card>
  );
}
