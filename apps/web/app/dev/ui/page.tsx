"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bell,
  CalendarClock,
  Compass,
  Download,
  FileText,
  FlaskConical,
  HeartPulse,
  Info,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";
import {
  AiBanner,
  Badge,
  Button,
  Card,
  ChartSkeleton,
  Chip,
  Dialog,
  DropdownMenu,
  EmergencyBanner,
  EmptyState,
  GlassCard,
  Input,
  PageHeader,
  ProgressBar,
  SearchInput,
  Select,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonText,
  StatTile,
  TabGroup,
  Table,
  Textarea,
  Tooltip,
  useToast,
} from "@/components/ui";

export default function UiKitShowcase() {
  const { t } = useI18n();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "security" | "analytics">("general");
  const [searchValue, setSearchValue] = useState("");
  const [progress, setProgress] = useState(65);

  const sampleDropdownItems = [
    { key: "1", label: "View Profile", icon: Users, onClick: () => addToast("info", "Profile clicked") },
    { key: "2", label: "Export Records", icon: Download, onClick: () => addToast("success", "Export started") },
    { key: "3", label: "Revoke Consent", icon: Trash2, danger: true, onClick: () => addToast("warning", "Consent revoked") },
  ];

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title={t("dev.title") || "Design System Kit"}
        subtitle="Comprehensive component gallery for MediBridge AI. Every component conforms to Midnight, Ivory, and Neon tokens."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Design System", href: "/dev/ui" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={() => addToast("success", "Design tokens active", "Midnight Black (#07090B) + Neon Accent (#39FF88)")}
            >
              Test Notification
            </Button>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              Open Dialog
            </Button>
          </div>
        }
      />

      {/* 1. BUTTONS */}
      <Card className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">1. Buttons</h2>
          <p className="text-xs text-muted">Variants, sizes, busy states, and icon placements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost Link</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button busy>Saving...</Button>
          <Button icon={UploadCloud}>With Icon</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line">
          <Button size="xs">Extra Small (xs)</Button>
          <Button size="sm">Small (sm)</Button>
          <Button size="md">Medium (md)</Button>
          <Button size="lg">Large (lg)</Button>
        </div>
      </Card>

      {/* 2. CHIPS & BADGES */}
      <Card className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">2. Chips & Badges</h2>
          <p className="text-xs text-muted">Never rely on color alone: every chip contains an icon and accessible label.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              "verified",
              "doctor",
              "pending",
              "unverified",
              "low",
              "ai",
              "emergency",
              "stale",
              "info",
              "failed",
              "processing",
              "extracted",
            ] as const
          ).map((k) => (
            <Chip key={k} kind={k} />
          ))}
        </div>
        <div className="flex items-center gap-4 pt-2 border-t border-line">
          <span className="text-xs text-muted font-medium">Badges:</span>
          <div className="flex items-center gap-2">
            <Badge count={3} variant="primary" />
            <Badge count={18} variant="danger" />
            <Badge count={99} variant="warn" />
            <Badge count={142} variant="info" />
            <Badge count={5} variant="neutral" />
            <Badge dot variant="primary" />
            <Badge dot variant="danger" />
          </div>
        </div>
      </Card>

      {/* 3. INPUTS & FORM CONTROLS */}
      <Card className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">3. Form Inputs & Select</h2>
          <p className="text-xs text-muted">Full keyboard accessibility, focus rings, hints, and error alerts.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Full Name" placeholder="e.g. Dr. Tahsin Rahman" hint="As shown on BMDC registration" icon={Users} />
          <Input label="BMDC Number" placeholder="e.g. A-12345" error="Invalid registration format" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SearchInput
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClear={() => setSearchValue("")}
            placeholder="Search with auto clear button..."
          />
          <Select label="Preferred Hospital District">
            <option>Dhaka (Dhanmondi, Uttara, Gulshan)</option>
            <option>Chittagong</option>
            <option>Sylhet</option>
          </Select>
        </div>
        <Textarea label="Clinical Chief Complaint" placeholder="Describe clinical symptoms or history..." />
      </Card>

      {/* 4. METRIC CARDS & STAT TILES */}
      <div>
        <h2 className="mb-3 text-xl font-bold">4. Stat Tiles & Metric Indicators</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Total Reports"
            value="12"
            icon={FileText}
            accent
            trend="up"
            trendLabel="+2 this month"
          />
          <StatTile
            label="Values Tracked"
            value="148"
            icon={Activity}
            trend="up"
            trendLabel="Across 7 test types"
          />
          <StatTile
            label="Verified Doctors"
            value="8"
            icon={Stethoscope}
            trend="neutral"
            trendLabel="Consents active"
          />
          <StatTile
            label="Abnormal Flags"
            value="3"
            icon={AlertTriangle}
            trend="down"
            trendLabel="1 resolved"
          />
        </div>
      </div>

      {/* 5. TABS, DROPDOWN & TOOLTIP */}
      <Card className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">5. Tabs, Tooltips & Dropdowns</h2>
          <p className="text-xs text-muted">Interactive navigational elements with seamless state handling.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabGroup
            tabs={[
              { key: "general", label: "General", icon: Layers, count: 2 },
              { key: "security", label: "Security & Sharing", icon: ShieldCheck },
              { key: "analytics", label: "Analytics & ML", icon: FlaskConical, count: 4 },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
          <div className="flex items-center gap-3">
            <Tooltip text="Click for actions dropdown">
              <DropdownMenu
                trigger={
                  <Button variant="secondary" size="sm">
                    Action Menu ▼
                  </Button>
                }
                items={sampleDropdownItems}
              />
            </Tooltip>
          </div>
        </div>
        <div className="rounded-input border border-line bg-s2/40 p-4 text-xs text-muted">
          Active Tab: <span className="font-bold text-ink uppercase">{activeTab}</span>
        </div>
      </Card>

      {/* 6. PROGRESS & LOADING INDICATORS */}
      <Card className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">6. Progress Bars & Loading States</h2>
          <p className="text-xs text-muted">Real operation states: upload percentage, scoring, and skeleton placeholders.</p>
        </div>
        <div className="space-y-3">
          <ProgressBar value={progress} max={100} label={`OCR Parsing (${progress}%)`} />
          <ProgressBar indeterminate label="Classifier Running..." />
          <div className="flex gap-2 pt-2">
            <Button size="xs" variant="secondary" onClick={() => setProgress((p) => Math.max(0, p - 15))}>-15%</Button>
            <Button size="xs" variant="secondary" onClick={() => setProgress((p) => Math.min(100, p + 15))}>+15%</Button>
          </div>
        </div>
        <div className="pt-4 border-t border-line space-y-4">
          <p className="text-xs font-semibold uppercase text-muted">Skeleton Loaders:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonText lines={4} />
          </div>
        </div>
      </Card>

      {/* 7. TABLES */}
      <Card className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">7. Data Table</h2>
          <p className="text-xs text-muted">Structured medical records and audit log format.</p>
        </div>
        <Table>
          <thead>
            <tr>
              <th>Test Code</th>
              <th>Observed Value</th>
              <th>Reference Range</th>
              <th>Verification</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold text-ink">HGB (Hemoglobin)</td>
              <td className="num font-semibold text-ptext">13.8 g/dL</td>
              <td className="num text-muted">12.0 – 16.0 g/dL</td>
              <td><Chip kind="doctor" /></td>
              <td><span className="text-xs font-medium text-ptext">Normal</span></td>
            </tr>
            <tr>
              <td className="font-bold text-ink">WBC (White Blood Count)</td>
              <td className="num font-semibold text-warn">11.4 × 10³/μL</td>
              <td className="num text-muted">4.0 – 10.0 × 10³/μL</td>
              <td><Chip kind="low" /></td>
              <td><span className="text-xs font-medium text-warn">Slightly elevated</span></td>
            </tr>
            <tr>
              <td className="font-bold text-ink">GLU (Fasting Glucose)</td>
              <td className="num font-semibold text-ink">5.4 mmol/L</td>
              <td className="num text-muted">3.9 – 6.1 mmol/L</td>
              <td><Chip kind="unverified" /></td>
              <td><span className="text-xs font-medium text-muted">Extracted (unverified)</span></td>
            </tr>
          </tbody>
        </Table>
      </Card>

      {/* 8. EMERGENCY & AI BANNERS */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">8. Critical Notice Banners</h2>
        <AiBanner />
        <EmergencyBanner text="Chest pain with breathlessness detected. Immediate emergency medical intervention required." />
      </div>

      {/* 9. EMPTY STATE */}
      <Card>
        <EmptyState
          icon={CalendarClock}
          title="No Upcoming Consultations"
          body="Use the SmartCare Navigator to match with clinically eligible providers in Dhaka."
          action={<Button size="sm">Find Care Now</Button>}
        />
      </Card>

      {/* ACCESSIBLE MODAL DIALOG */}
      <Dialog open={modalOpen} title="Sample Modal Dialog" onClose={() => setModalOpen(false)}>
        <div className="space-y-4 text-sm">
          <p className="text-muted leading-relaxed">
            This modal includes focus trapping, keyboard Escape handler, backdrop click dismissal, and accessible ARIA attributes.
          </p>
          <Input label="Confirmation Code" placeholder="Enter 6-digit verification..." />
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setModalOpen(false);
                addToast("success", "Action Confirmed", "Your changes have been saved.");
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
