"use client";
import { useI18n } from "@/lib/i18n";
import { AiBanner, Button, Card, Chip, EmergencyBanner, Input, Skeleton, StatTile } from "@/components/ui";

// Design-system showcase: every state of every shared component, in both themes (use the toggle in the header).
export default function UiKit() {
  const { t } = useI18n();
  return (
    <>
      <h1 className="text-3xl">{t("dev.title")}</h1>
      <Card className="space-y-2"><h2 className="text-xl">Buttons</h2><div className="flex flex-wrap gap-2"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button disabled>Disabled</Button></div></Card>
      <Card className="space-y-2"><h2 className="text-xl">Chips (icon + label, never colour alone)</h2><div className="flex flex-wrap gap-2">{(["verified", "doctor", "pending", "unverified", "low", "ai", "emergency", "stale"] as const).map((k) => <Chip key={k} kind={k} />)}</div></Card>
      <Card className="space-y-2"><h2 className="text-xl">Inputs</h2><Input label="Label" placeholder="Placeholder" hint="Hint text" /></Card>
      <div className="grid grid-cols-3 gap-3"><StatTile label="Hemoglobin" value="13.5" /><StatTile label="WBC" value="6.8" /><StatTile label="Platelet" value="255" /></div>
      <Card><h2 className="mb-2 text-xl">States</h2><Skeleton h={48} /></Card>
      <AiBanner /><EmergencyBanner />
      <Card><h2 className="mb-2 text-xl">Type scale</h2><p className="text-xs">12 xs</p><p className="text-sm">14 sm</p><p>16 base</p><p className="text-xl">20 xl</p><p className="text-2xl">28 2xl</p><p className="text-3xl">40 3xl</p><p className="num">0123456789 tabular</p></Card>
    </>
  );
}
