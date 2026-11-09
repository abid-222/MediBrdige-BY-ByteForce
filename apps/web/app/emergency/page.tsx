"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Copy,
  Flame,
  HeartPulse,
  Info,
  LifeBuoy,
  LogIn,
  Phone,
  PhoneCall,
  Pill,
  Plus,
  Printer,
  QrCode,
  Save,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  Zap,
} from "lucide-react";
import { getRole, getToken } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import { Button, Card, PageHeader, useToast } from "@/components/ui";
import { VerifiableQrCode } from "@/components/VerifiableQrCode";

interface MedicalIdData {
  fullName: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  specialInstructions: string;
}

const EMPTY_MEDICAL_ID: MedicalIdData = {
  fullName: "",
  bloodGroup: "O+",
  emergencyContactName: "",
  emergencyContactPhone: "",
  allergies: "",
  chronicConditions: "",
  currentMedications: "",
  specialInstructions: "",
};

export default function EmergencyPage() {
  const { locale } = useI18n();
  const isBn = locale === "bn";
  const { addToast } = useToast();

  const [activeGuide, setActiveGuide] = useState<string>("cpr");
  const [medicalId, setMedicalId] = useState<MedicalIdData>(EMPTY_MEDICAL_ID);
  const [hasCard, setHasCard] = useState<boolean>(false);
  const [isEditingId, setIsEditingId] = useState(false);
  const [isSyncedFromProfile, setIsSyncedFromProfile] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  // Role detection
  const [currentRole, setCurrentRole] = useState<string>("none");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    setIsLoggedIn(!!token);
    setCurrentRole(token ? role || "none" : "none");
  }, []);

  const isPatient = isLoggedIn && currentRole === "patient";
  const isDoctor = isLoggedIn && currentRole === "doctor";
  const isStaff = isLoggedIn && (currentRole === "facility_admin" || currentRole === "facility_staff" || currentRole === "super_admin");

  // Query authenticated patient profile if logged in as patient
  const patientApi = useApi(isPatient ? "/patients/me" : null);

  // Load Medical ID: checks localStorage first, then syncs from patient profile if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem("niramoy_offline_medical_id");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.fullName?.trim()) {
          setMedicalId(parsed);
          setHasCard(true);
          return;
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    // If no localStorage card, auto-populate from patient's authenticated clinical profile
    if (patientApi.data) {
      const p = patientApi.data;
      if (p.full_name) {
        const fromProfile: MedicalIdData = {
          fullName: p.full_name || "",
          bloodGroup: "O+",
          emergencyContactName: p.emergency_name
            ? `${p.emergency_name}${p.emergency_relation ? ` (${p.emergency_relation})` : ""}`
            : "",
          emergencyContactPhone: p.emergency_phone || p.phone || "",
          allergies: (p.allergies || []).join(", "),
          chronicConditions: (p.conditions || []).join(", "),
          currentMedications: (p.medications || []).join(", "),
          specialInstructions: "",
        };
        setMedicalId(fromProfile);
        setHasCard(true);
        setIsSyncedFromProfile(true);
      }
    }
  }, [patientApi.data]);

  const handleSaveMedicalId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicalId.fullName.trim()) {
      addToast("error", "Name Required", "Please enter your full name.");
      return;
    }
    try {
      localStorage.setItem("niramoy_offline_medical_id", JSON.stringify(medicalId));
      setHasCard(true);
      setIsEditingId(false);
      addToast(
        "success",
        isBn ? "মেডিকেল আইডি সংরক্ষিত" : "Medical ID Saved",
        isBn
          ? "আপনার জরুরি মেডিকেল তথ্য লোকাল ডিভাইসে সফলভাবে সেভ হয়েছে।"
          : "Emergency medical information securely saved to offline device storage."
      );
    } catch {
      addToast("error", "Save Failed", "Could not save to local storage.");
    }
  };

  const handleClearCard = () => {
    try {
      localStorage.removeItem("niramoy_offline_medical_id");
      setMedicalId(EMPTY_MEDICAL_ID);
      setHasCard(false);
      setIsEditingId(false);
      setIsSyncedFromProfile(false);
      addToast(
        "info",
        isBn ? "কার্ড মুছে ফেলা হয়েছে" : "Medical ID Cleared",
        isBn ? "এই ডিভাইস থেকে মেডিকেল তথ্য মুছে ফেলা হয়েছে।" : "Emergency card removed from this device."
      );
    } catch {
      // Ignore
    }
  };

  const handleCopyHotline = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
    addToast(
      "success",
      isBn ? "নাম্বার কপি হয়েছে" : "Number Copied",
      `${num} ${isBn ? "ক্লিপবোর্ডে কপি করা হয়েছে।" : "copied to clipboard."}`
    );
  };

  const qrDataString = hasCard
    ? `NIRAMOY-EMERGENCY-ID | Name: ${medicalId.fullName} | Blood: ${medicalId.bloodGroup} | Emergency Contact: ${medicalId.emergencyContactName} (${medicalId.emergencyContactPhone}) | Allergies: ${medicalId.allergies || "None"} | Conditions: ${medicalId.chronicConditions || "None"}`
    : "";

  // Step-by-step first aid guides
  const guides: Record<
    string,
    {
      titleEn: string;
      titleBn: string;
      badgeEn: string;
      badgeBn: string;
      color: string;
      stepsEn: { title: string; desc: string; alert?: string }[];
      stepsBn: { title: string; desc: string; alert?: string }[];
    }
  > = {
    cpr: {
      titleEn: "Adult CPR (Cardiopulmonary Resuscitation)",
      titleBn: "কার্ডিয়াক অ্যারেস্ট ও সিপিআর (CPR)",
      badgeEn: "Critical • Sudden Collapse",
      badgeBn: "জরুরি অবস্থা • সংজ্ঞাহীন রোগী",
      color: "border-red-500/40 text-red-400 bg-red-500/10",
      stepsEn: [
        {
          title: "1. Check Responsiveness & Breathing",
          desc: "Tap the shoulders firmly and shout 'Are you okay?'. Check if the person is breathing normally for no more than 10 seconds.",
        },
        {
          title: "2. Call 999 Immediately",
          desc: "Instruct someone specifically: 'Call 999 for an ambulance and get an AED'. If alone with a phone, put it on speaker.",
          alert: "Every second counts: brain damage begins within 4 minutes without blood flow.",
        },
        {
          title: "3. Hard & Fast Chest Compressions",
          desc: "Place the heel of one hand in the center of the chest (lower half of sternum). Interlock fingers. Push hard and fast: 100-120 beats per minute, 2 inches (5 cm) deep. Allow chest to fully recoil.",
        },
        {
          title: "4. 30 Compressions : 2 Rescue Breaths",
          desc: "Give 30 chest compressions, tilt head back, pinch nose, and deliver 2 gentle breaths (1 second each). If untrained, perform continuous hands-only chest compressions without pausing.",
        },
      ],
      stepsBn: [
        {
          title: "১. রোগীর সাড়া ও শ্বাস-প্রশ্বাস পরীক্ষা করুন",
          desc: "রোগীর দুই কাঁধে মৃদু ঝাঁকুনি দিয়ে জোরে ডাকুন—'আপনি কি আমাকে শুনতে পাচ্ছেন?'. ৫-১০ সেকেন্ড লক্ষ্য করুন বুক ওঠানামা করছে কি না।",
        },
        {
          title: "২. সাথে সাথে ৯৯৯-এ অ্যাম্বুলেন্সের জন্য কল দিন",
          desc: "কাউকে নির্দিষ্ট করে বলুন: 'দ্রুত ৯৯৯-এ কল দিয়ে জরুরি অ্যাম্বুলেন্স ডাকুন'। আপনি একা থাকলে ফোন স্পিকারে দিয়ে কথা বলতে বলতে সিপিআর শুরু করুন।",
          alert: "প্রতিটি সেকেন্ড মূল্যবান: ৪ মিনিট রক্ত চলাচল বন্ধ থাকলে মস্তিষ্কের স্থায়ী ক্ষতি হয়।",
        },
        {
          title: "৩. বুকের মাঝে দ্রুত ও শক্ত চাপ (কম্প্রেশন)",
          desc: "রোগীকে শক্ত মেঝেতে চিত করে শোয়ান। বুকের পাঁজরের ঠিক মাঝে এক হাতের তালু রেখে অন্য হাত দিয়ে আঁকড়ে ধরুন। কনুই সোজা রেখে মিনিটে ১০০-১২০ বার গতিতে ২ ইঞ্চি গভীরে চাপ দিন।",
        },
        {
          title: "৪. ৩০টি চাপ : ২টি কৃত্রিম শ্বাস",
          desc: "৩০ বার বুকে চাপ দেওয়ার পর রোগীর মাথা সামান্য পেছনে হেলিয়ে নাক চেপে ধরে মুখে মুখ লাগিয়ে ২টি শ্বাস দিন। কৃত্রিম শ্বাস দিতে অস্বস্তি বোধ হলে বিরতিহীনভাবে শুধু বুকে চাপ দিতে থাকুন।",
        },
      ],
    },
    stroke: {
      titleEn: "FAST Protocol for Stroke Recognition",
      titleBn: "স্ট্রোক সনাক্তকরণ ও তাৎক্ষণিক ব্যবস্থা (FAST)",
      badgeEn: "Brain Emergency • Time Critical",
      badgeBn: "মস্তিষ্কের জরুরি অবস্থা • দ্রুত পদক্ষেপ",
      color: "border-amber-500/40 text-amber-400 bg-amber-500/10",
      stepsEn: [
        {
          title: "F — Face Drooping",
          desc: "Ask the person to smile. Does one side of the face droop or is the smile uneven?",
        },
        {
          title: "A — Arm Weakness",
          desc: "Ask the person to raise both arms. Does one arm drift downward or cannot be raised at all?",
        },
        {
          title: "S — Speech Difficulty",
          desc: "Ask the person to repeat a simple sentence like 'The sky is blue'. Is speech slurred or strange?",
        },
        {
          title: "T — Time to Call 999",
          desc: "If you observe ANY of these signs, call 999 immediately. Note the exact time when symptoms first appeared for emergency doctors.",
          alert: "NEVER give aspirin, water, or food to an unconscious or suspected stroke patient.",
        },
      ],
      stepsBn: [
        {
          title: "F — Face (মুখের বিকৃতি বা একপাশ বাঁকা)",
          desc: "রোগীকে হাসতে বলুন। লক্ষ্য করুন মুখের একপাশ অবশ বা বাঁকা হয়ে ঝুলছে কি না।",
        },
        {
          title: "A — Arms (হাতের দুর্বলতা)",
          desc: "রোগীকে দুই হাত সমানভাবে উপরে তুলতে বলুন। এক হাত কি নিচে নেমে যাচ্ছে বা অবশ হয়ে আছে?",
        },
        {
          title: "S — Speech (কথা জড়িয়ে যাওয়া)",
          desc: "একটি সহজ বাক্য বলতে বলুন (যেমন: 'আমার নাম রহিম')। কথা কি জড়িয়ে যাচ্ছে বা বুঝতে সমস্যা হচ্ছে?",
        },
        {
          title: "T — Time (দেরি না করে দ্রুত ৯৯৯-এ কল)",
          desc: "উপরের যেকোনো একটি লক্ষণ দেখলেই সাথে সাথে ৯৯৯-এ কল করে নিকটস্থ স্ট্রোক সেন্টারে নিয়ে যান। লক্ষণ প্রথম কখন শুরু হয়েছিল তা ঘড়ি দেখে লিখে রাখুন।",
          alert: "সতর্কতা: স্ট্রোকের রোগীকে মুখে কোনো খাবার, পানি বা অ্যাসপিরিন ট্যাবলেট খাওয়াবেন না।",
        },
      ],
    },
    bleeding: {
      titleEn: "Severe Bleeding & Hemorrhage Control",
      titleBn: "তীব্র রক্তক্ষরণ নিয়ন্ত্রণ ও প্রাথমিক চিকিৎসা",
      badgeEn: "Trauma • Hemostasis",
      badgeBn: "দুর্ঘটনা ও আঘাত • রক্তপাত বন্ধ",
      color: "border-red-500/40 text-red-400 bg-red-500/10",
      stepsEn: [
        {
          title: "1. Apply Firm Direct Pressure",
          desc: "Place a sterile gauze or cleanest cloth available directly over the wound. Press firmly with both hands without lifting.",
        },
        {
          title: "2. Do Not Remove Soaked Dressings",
          desc: "If blood soaks through, add more layers on top. Do NOT peel away original dressing as it disrupts clotting.",
        },
        {
          title: "3. Elevate Wounded Limb",
          desc: "If no fracture is suspected, elevate the bleeding arm or leg above the level of the heart to slow arterial flow.",
        },
        {
          title: "4. Severe Limb Bleeding (Tourniquet)",
          desc: "For life-threatening spurting limb bleeding that direct pressure fails to stop, apply a commercial or improvised tourniquet 2-3 inches above the wound (not over a joint). Note application time.",
          alert: "Seek immediate emergency trauma care. Keep patient warm and lying down.",
        },
      ],
      stepsBn: [
        {
          title: "১. ক্ষতস্থানে সরাসরি শক্ত চাপ দিন",
          desc: "পরিষ্কার গজ ব্যান্ডেজ বা পরিষ্কার কাপড় ক্ষতস্থানে চেপে ধরে দুই হাত দিয়ে সমানভাবে শক্ত চাপ দিন।",
        },
        {
          title: "২. কাপড় ভিজে গেলে তুলে ফেলবেন না",
          desc: "রক্তে কাপড় ভিজে গেলে তা না তুলে তার উপরেই আরও কাপড় বা তুলা যোগ করে চাপ অব্যাহত রাখুন। মূল কাপড় তুললে জমাট রক্ত নষ্ট হয়ে রক্তপাত বাড়ে।",
        },
        {
          title: "৩. আঘাতপ্রাপ্ত অঙ্গটি উঁচুতে রাখুন",
          desc: "হাড় ভাঙার সন্দেহ না থাকলে রক্ত পড়া হাত বা পা রোগীর হৃদপিন্ডের উচ্চতার চেয়ে উপরে তুলে রাখুন।",
        },
        {
          title: "৪. জরুরি টর্নিকেট পদ্ধতি (বাহু বা পায়ের ক্ষেত্রে)",
          desc: "জীবন সংশয়কারী ফিনকি দেওয়া রক্তপাত বন্ধ না হলে ক্ষতস্থানের ২-৩ ইঞ্চি উপরে চওড়া ব্যান্ডেজ বা বেল্ট শক্ত করে বেঁধে দিন এবং সময় লিখে রাখুন।",
          alert: "রোগীকে উষ্ণ রাখুন এবং দ্রুত নিকটস্থ ট্রমা হাসপাতালে স্থানান্তর করুন।",
        },
      ],
    },
    snakebite: {
      titleEn: "Snakebite & Venom First-Aid Protocol",
      titleBn: "সর্পদংশন ও বিষক্রিয়া প্রটোকল",
      badgeEn: "Urgent • Antivenom Hospitalization",
      badgeBn: "জরুরি • অ্যান্টিভেনম হাসপাতাল",
      color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
      stepsEn: [
        {
          title: "1. Keep Calm and Completely Immobilize",
          desc: "Keep the victim calm. Restrict physical movement. Immobilize the bitten limb using a splint or sling at heart level.",
        },
        {
          title: "2. Remove Rings, Bangles & Tight Clothing",
          desc: "Remove jewelry, watches, tight clothes, and shoes from bitten limb before rapid swelling develops.",
        },
        {
          title: "3. DO NOT CUT, SUCK, OR TIE TIGHT ROPES",
          desc: "NEVER cut the bite wound with blades. NEVER suck venom with mouth. NEVER apply tight tourniquets or herbal pastes. These cause severe gangrene and limb loss.",
          alert: "CRITICAL: Cutting or tight cords cause tissue death. Clean gently with soap and water only.",
        },
        {
          title: "4. Rush to Upazila Health Complex / Medical College",
          desc: "Government Upazila Health Complexes and Medical College Hospitals have free Antivenom. Transport patient lying flat on side.",
        },
      ],
      stepsBn: [
        {
          title: "১. রোগীকে শান্ত রাখুন ও আক্রান্ত অঙ্গ স্থির রাখুন",
          desc: "রোগীকে আতঙ্কিত হতে দেবেন না। দৌড়াদৌড়ি বা হাঁটাহাঁটি করা নিষেধ। আক্রান্ত হাত বা পা বাঁশের চটা বা কাপড় দিয়ে স্প্লিন্ট করে স্থির রাখুন।",
        },
        {
          title: "২. আংটি, চুড়ি ও আঁটসাঁট পোশাক খুলে ফেলুন",
          desc: "আক্রান্ত স্থানে দ্রুত ফোলা শুরু হওয়ার আগেই হাতের আংটি, চুড়ি, ঘড়ি এবং আঁটসাঁট জুতো-মোজা খুলে ফেলুন।",
        },
        {
          title: "৩. কোনো অবস্থাতেই কাটবেন না বা বাঁধন দেবেন না",
          desc: "ব্লেড দিয়ে কাটা, মুখ দিয়ে বিষ চোষা, শক্ত দড়ি বা রশি দিয়ে রক্ত চলাচল বন্ধ করা এবং ওঝার ঝাড়ফুঁক মারাত্মক ক্ষতিকর। এতে হাত-পা পচে অঙ্গহানি হয়।",
          alert: "মারাত্মক ভুল: ওঝার কাছে গিয়ে সময় নষ্ট করবেন না। সাবান-পানি দিয়ে হালকা ধুয়ে ফেলুন।",
        },
        {
          title: "৪. সরকারি উপজেলা স্বাস্থ্য কমপ্লেক্স বা মেডিকেল কলেজে নিন",
          desc: "বাংলাদেশের সকল সরকারি উপজেলা স্বাস্থ্য কমপ্লেক্স ও মেডিকেল কলেজ হাসপাতালে বিনামূল্যে অ্যান্টিভেনম পাওয়া যায়। রোগীকে শুইয়ে দ্রুত সেখানে নিন।",
        },
      ],
    },
    choking: {
      titleEn: "Choking Relief & Heimlich Maneuver",
      titleBn: "গলায় খাবার বা বস্তু আটকে দম বন্ধ হওয়া (চোকিং)",
      badgeEn: "Airway Obstruction",
      badgeBn: "শ্বাসনালীর বাধা • হেইমলিখ পদ্ধতি",
      color: "border-sky-500/40 text-sky-400 bg-sky-500/10",
      stepsEn: [
        {
          title: "1. Assess Severity (Can they cough or speak?)",
          desc: "If the victim can cough forcefully or speak, encourage them to keep coughing. If they clutch throat and cannot breathe, intervene immediately.",
        },
        {
          title: "2. 5 Back Blows",
          desc: "Lean the person slightly forward. Deliver 5 firm blows between the shoulder blades with the heel of your hand.",
        },
        {
          title: "3. 5 Abdominal Thrusts (Heimlich Maneuver)",
          desc: "Stand behind victim. Wrap arms around waist. Make a fist just above navel, grasp fist with other hand, and pull sharply inward and upward 5 times.",
        },
        {
          title: "4. Repeat Cycle or Start CPR if Unresponsive",
          desc: "Alternate 5 back blows and 5 abdominal thrusts until object is expelled. If victim becomes unconscious, lower to ground and start CPR immediately.",
        },
      ],
      stepsBn: [
        {
          title: "১. তীব্রতা যাচাই করুন (রোগী কি কাশতে পারছে?)",
          desc: "রোগী যদি কাশতে পারে বা কথা বলতে পারে, তবে তাকে জোরে জোরে কাশতে উৎসাহিত করুন। যদি রোগী দুই হাত দিয়ে গলা চেপে ধরে এবং শ্বাস নিতে না পারে, তবে তাৎক্ষণিক সহায়তা দিন।",
        },
        {
          title: "২. পিঠের মাঝে ৫টি আঘাত (Back Blows)",
          desc: "রোগীকে সামান্য সামনের দিকে ঝুঁকিয়ে এক হাত দিয়ে বুক ধরে অন্য হাতের তালু দিয়ে দুই কাঁধের হাড়ের মাঝখানে ৫ বার শক্ত চাপ দিন।",
        },
        {
          title: "৩. পেটে ভেতরের দিকে চাপ (হেইমলিখ ম্যানুভার)",
          desc: "রোগীর পেছনে দাঁড়িয়ে কোমর জড়িয়ে ধরুন। নাভির ঠিক উপরে এক হাতের মুষ্টি রেখে অন্য হাত দিয়ে আঁকড়ে ধরে দ্রুত পেটের ভেতর ও ওপরের দিকে ৫ বার হ্যাঁচকা টান দিন।",
        },
        {
          title: "৪. পুনরাবৃত্তি ও সংজ্ঞাহীন হলে সিপিআর",
          desc: "বস্তুটি বের না হওয়া পর্যন্ত ৫টি পিঠে আঘাত এবং ৫টি পেটে চাপ পর্যায়ক্রমে চালিয়ে যান। রোগী জ্ঞান হারালে মেঝেতে শুইয়ে সাথে সাথে সিপিআর শুরু করুন।",
        },
      ],
    },
  };

  const activeGuideData = guides[activeGuide] || guides.cpr;
  const currentSteps = isBn ? activeGuideData.stepsBn : activeGuideData.stepsEn;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <PageHeader
        title={isBn ? "জরুরি ফার্স্ট-এইড হাব ও অফলাইন মেডিকেল আইডি" : "Emergency First-Aid Hub & Offline Medical ID"}
        subtitle={
          isBn
            ? "১০০% অফলাইন সমর্থিত। ইন্টারনেট বা লগইন ছাড়াই তাৎক্ষণিক জাতীয় হেল্পলাইন ও জীবন রক্ষাকারী প্রাথমিক চিকিৎসা গাইড।"
            : "100% offline available. Direct emergency hotline dispatch, life-saving step-by-step protocols, and offline Medical ID QR card."
        }
        breadcrumbs={[
          { label: isBn ? "হোম" : "Home", href: "/" },
          { label: isBn ? "জরুরি চিকিৎসা" : "Emergency Care", href: "/emergency" },
        ]}
        actions={
          hasCard ? (
            <Button
              size="sm"
              variant="secondary"
              icon={Printer}
              onClick={() => window.print()}
            >
              {isBn ? "জরুরি কার্ড প্রিন্ট" : "Print Emergency Card"}
            </Button>
          ) : undefined
        }
      />

      {/* Role-Aware Notice Banner */}
      {isDoctor && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-foreground">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              {isBn
                ? "ডাক্তার ওয়ার্কস্পেস মোড: ক্লিনিক্যাল প্রটোকল ও ন্যাশনাল ইমার্জেন্সি নির্দেশিকা দ্রুত রেফারেন্স হিসেবে সক্রিয় আছে।"
                : "Doctor Mode: Clinical resuscitation protocols, antidote guidelines, and 24/7 hotline dispatch are available for emergency triage."}
            </span>
          </div>
          <Link href="/doctor" className="font-bold text-emerald-400 hover:underline shrink-0">
            {isBn ? "ডাক্তার ড্যাশবোর্ড →" : "Doctor Dashboard →"}
          </Link>
        </div>
      )}

      {isStaff && (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3 text-xs text-foreground">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-blue-400 shrink-0" />
            <span>
              {isBn
                ? "অ্যাডমিন ও হসপিটাল স্টাফ মোড: হাসপাতালের জরুরি ট্রমা ও রেফারেল গাইডলাইন সক্রিয়।"
                : "Hospital Admin / Staff Mode: Emergency trauma referral & first-aid guidelines active."}
            </span>
          </div>
          <Link href="/admin" className="font-bold text-blue-400 hover:underline shrink-0">
            {isBn ? "অ্যাডমিন প্যানেল →" : "Admin Panel →"}
          </Link>
        </div>
      )}

      {/* 24/7 National Emergency Hotlines Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-heading font-black tracking-wider uppercase text-foreground flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-red-500 animate-pulse" />
            {isBn ? "জাতীয় ও জরুরি চিকিৎসা হটলাইন (২৪/৭ ফ্রি সেবা)" : "24/7 National Emergency Hotlines"}
          </h2>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {isBn ? "ইন্টারনেট ছাড়া সরাসরি কল" : "Direct Dial Works Offline"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Hotline 999 */}
          <div className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-b from-red-950/30 to-card p-4 space-y-2 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-heading font-black text-2xl text-red-400 tracking-tight">999</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500 text-white">
                {isBn ? "জাতীয় জরুরি" : "National"}
              </span>
            </div>
            <p className="font-bold text-xs text-foreground">
              {isBn ? "অ্যাম্বুলেন্স, পুলিশ ও ফায়ার সার্ভিস" : "Ambulance, Fire & Police Dispatch"}
            </p>
            <p className="text-[11px] text-muted">
              {isBn ? "টোল-ফ্রি জরুরি সরকারি কেন্দ্রীয় কল সেন্টার" : "Free national emergency dispatch center."}
            </p>
            <div className="pt-1 flex gap-2">
              <a
                href="tel:999"
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{isBn ? "সরাসরি কল (999)" : "Call 999"}</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopyHotline("999")}
                className="p-2 rounded-xl bg-card border border-border/80 hover:bg-muted/20 text-muted hover:text-foreground transition"
                title="Copy Number"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Hotline 16263 */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-card p-4 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-heading font-black text-2xl text-emerald-400 tracking-tight">16263</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white">
                {isBn ? "স্বাস্থ্য বাতায়ন" : "Doctor Advice"}
              </span>
            </div>
            <p className="font-bold text-xs text-foreground">
              {isBn ? "স্বাস্থ্য অধিদপ্তর টেলিমেডিসিন" : "Shastho Batayon 24/7 Hotline"}
            </p>
            <p className="text-[11px] text-muted">
              {isBn ? "সরকারি ডাক্তারের সাথে সরাসরি বিনামূল্যে পরামর্শ" : "Direct medical doctor consultation 24/7."}
            </p>
            <div className="pt-1 flex gap-2">
              <a
                href="tel:16263"
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{isBn ? "সরাসরি কল (16263)" : "Call 16263"}</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopyHotline("16263")}
                className="p-2 rounded-xl bg-card border border-border/80 hover:bg-muted/20 text-muted hover:text-foreground transition"
                title="Copy Number"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Hotline 10655 */}
          <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-card p-4 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-heading font-black text-2xl text-amber-400 tracking-tight">10655</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-600 text-white">
                {isBn ? "আইইডিসিআর" : "Epidemic"}
              </span>
            </div>
            <p className="font-bold text-xs text-foreground">
              {isBn ? "রোগ নিয়ন্ত্রণ ও মহামারি ইনফো" : "IEDCR Disease Control Helpline"}
            </p>
            <p className="text-[11px] text-muted">
              {isBn ? "ডেঙ্গু, নিপাহ, বিষক্রিয়া ও সংক্রামক রোগ সহায়তা" : "Epidemic outbreak, poisons & infection help."}
            </p>
            <div className="pt-1 flex gap-2">
              <a
                href="tel:10655"
                className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{isBn ? "সরাসরি কল (10655)" : "Call 10655"}</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopyHotline("10655")}
                className="p-2 rounded-xl bg-card border border-border/80 hover:bg-muted/20 text-muted hover:text-foreground transition"
                title="Copy Number"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Hotline 333 */}
          <div className="rounded-2xl border-2 border-blue-500/40 bg-gradient-to-b from-blue-950/30 to-card p-4 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-heading font-black text-2xl text-blue-400 tracking-tight">333</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white">
                {isBn ? "নাগরিক সেবা" : "Citizen"}
              </span>
            </div>
            <p className="font-bold text-xs text-foreground">
              {isBn ? "জাতীয় তথ্য ও জরুরি সহায়তা" : "National Citizen Assistance"}
            </p>
            <p className="text-[11px] text-muted">
              {isBn ? "সরকারি জরুরি সাহায্য ও স্বাস্থ্য তথ্য সেল" : "Govt emergency assistance & relief hotline."}
            </p>
            <div className="pt-1 flex gap-2">
              <a
                href="tel:333"
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{isBn ? "সরাসরি কল (333)" : "Call 333"}</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopyHotline("333")}
                className="p-2 rounded-xl bg-card border border-border/80 hover:bg-muted/20 text-muted hover:text-foreground transition"
                title="Copy Number"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: First-Aid Guides (Left) & Role-Aware Emergency Medical ID Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Step-by-Step Protocols (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              {isBn ? "জরুরি ফার্স্ট-এইড স্টেপ-বাই-স্টেপ গাইড" : "Step-by-Step Emergency Protocols"}
            </h3>
            <span className="text-[10px] font-mono text-muted">
              {isBn ? "চিকিৎসকদের ক্লিনিক্যাল প্রটোকল" : "Standard Resuscitation Protocols"}
            </span>
          </div>

          {/* Guide Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(guides).map(([key, g]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveGuide(key)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeGuide === key
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-card border border-border/70 text-muted hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {key === "cpr" && <HeartPulse className="h-3.5 w-3.5 text-red-400" />}
                {key === "stroke" && <AlertOctagon className="h-3.5 w-3.5 text-amber-400" />}
                {key === "bleeding" && <ShieldAlert className="h-3.5 w-3.5 text-red-400" />}
                {key === "snakebite" && <Stethoscope className="h-3.5 w-3.5 text-emerald-400" />}
                {key === "choking" && <LifeBuoy className="h-3.5 w-3.5 text-sky-400" />}
                <span>{isBn ? g.titleBn.split("(")[0] : g.titleEn.split("(")[0]}</span>
              </button>
            ))}
          </div>

          {/* Active Guide Card */}
          <div className="rounded-2xl border-2 border-border/80 bg-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h4 className="font-heading font-black text-base sm:text-lg text-foreground">
                  {isBn ? activeGuideData.titleBn : activeGuideData.titleEn}
                </h4>
                <p className="text-xs text-muted mt-0.5">
                  {isBn ? "জরুরি মুহুর্তে নিচের ধাপগুলো ক্রমানুসারে অনুসরণ করুন:" : "Follow these immediate action steps in sequence:"}
                </p>
              </div>
              <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border shrink-0 ${activeGuideData.color}`}>
                {isBn ? activeGuideData.badgeBn : activeGuideData.badgeEn}
              </span>
            </div>

            {/* Steps List */}
            <div className="space-y-3">
              {currentSteps.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-s2/40 border border-border/60 space-y-1.5 transition hover:border-emerald-500/30"
                >
                  <h5 className="font-bold text-xs sm:text-sm text-emerald-400 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold">
                      {idx + 1}
                    </span>
                    {s.title}
                  </h5>
                  <p className="text-xs text-foreground/90 pl-7 leading-relaxed">{s.desc}</p>
                  {s.alert && (
                    <div className="ml-7 mt-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{s.alert}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Role-Aware Emergency Medical ID Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <QrCode className="h-4 w-4 text-emerald-400" />
              {isBn ? "অফলাইন মেডিকেল আইডি কার্ড" : "Offline Medical ID QR Card"}
            </h3>
            {hasCard && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingId(!isEditingId)}
                  className="text-xs font-bold text-emerald-400 hover:underline"
                >
                  {isEditingId ? (isBn ? "প্রিভিউ দেখুন" : "View Preview") : (isBn ? "সম্পাদনা" : "Edit")}
                </button>
                <button
                  type="button"
                  onClick={handleClearCard}
                  className="text-xs font-bold text-danger hover:underline flex items-center gap-1"
                  title="Remove card from this device"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{isBn ? "মুছে ফেলুন" : "Clear"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Condition 1: Form editing mode */}
          {isEditingId ? (
            <form onSubmit={handleSaveMedicalId} className="rounded-2xl border-2 border-emerald-500/40 bg-card p-5 space-y-3">
              <p className="text-xs text-muted">
                {isBn
                  ? "আপনার ব্যক্তিগত জরুরি তথ্য নিচে লিখুন। এটি আপনার ব্রাউজারের লোকাল ডিভাইসে সুরক্ষিত থাকবে এবং ইন্টারনেট ছাড়াই প্যারামেডিকরা কিউআর স্ক্যান করে দেখতে পারবেন:"
                  : "Enter your personal emergency details below. This will be stored 100% locally on this device so first responders can scan it offline."}
              </p>

              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
                  {isBn ? "আপনার পূর্ণ নাম:" : "Full Name:"}
                </label>
                <input
                  type="text"
                  value={medicalId.fullName}
                  onChange={(e) => setMedicalId({ ...medicalId, fullName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg bg-bg border border-border text-foreground focus:border-emerald-500 outline-none"
                  placeholder="e.g. Md. Hasan Ali"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
                    {isBn ? "রক্তের গ্রুপ:" : "Blood Group:"}
                  </label>
                  <select
                    value={medicalId.bloodGroup}
                    onChange={(e) => setMedicalId({ ...medicalId, bloodGroup: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg bg-bg border border-border text-foreground focus:border-emerald-500 outline-none"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
                    {isBn ? "জরুরি ফোন নম্বর:" : "Emergency Phone:"}
                  </label>
                  <input
                    type="text"
                    value={medicalId.emergencyContactPhone}
                    onChange={(e) => setMedicalId({ ...medicalId, emergencyContactPhone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg bg-bg border border-border text-foreground focus:border-emerald-500 outline-none"
                    placeholder="+880 17..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
                  {isBn ? "জরুরি যোগাযোগের ব্যক্তি ও সম্পর্ক:" : "Emergency Contact Name & Relation:"}
                </label>
                <input
                  type="text"
                  value={medicalId.emergencyContactName}
                  onChange={(e) => setMedicalId({ ...medicalId, emergencyContactName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg bg-bg border border-border text-foreground focus:border-emerald-500 outline-none"
                  placeholder="e.g. Spouse / Brother / Father"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
                  {isBn ? "মারাত্মক অ্যালার্জি (যদি থাকে):" : "Severe Allergies:"}
                </label>
                <input
                  type="text"
                  value={medicalId.allergies}
                  onChange={(e) => setMedicalId({ ...medicalId, allergies: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg bg-bg border border-border text-foreground focus:border-emerald-500 outline-none"
                  placeholder="e.g. Penicillin, Aspirin, Peanuts"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
                  {isBn ? "ক্রনিক ডিজিজ / দীর্ঘমেয়াদী রোগ:" : "Chronic Conditions:"}
                </label>
                <input
                  type="text"
                  value={medicalId.chronicConditions}
                  onChange={(e) => setMedicalId({ ...medicalId, chronicConditions: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg bg-bg border border-border text-foreground focus:border-emerald-500 outline-none"
                  placeholder="e.g. Diabetes, Asthma, High Blood Pressure"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setIsEditingId(false)}>
                  {isBn ? "বাতিল" : "Cancel"}
                </Button>
                <Button size="sm" variant="primary" icon={Save} type="submit">
                  {isBn ? "কার্ড সংরক্ষণ করুন" : "Save Emergency Card"}
                </Button>
              </div>
            </form>
          ) : hasCard ? (
            /* Condition 2: Active User Medical ID Card */
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-950/20 p-5 space-y-4 shadow-lg">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-heading font-black text-sm tracking-tight text-foreground">
                      NIRAMOY EMERGENCY ID
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400 block font-bold">
                      {isSyncedFromProfile ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <UserCheck className="h-3 w-3" />
                          {isBn ? "পেশেন্ট প্রোফাইল ভেরিফাইড" : "Patient Profile Synced"}
                        </span>
                      ) : (
                        isBn ? "অফলাইন প্যারামেডিক কার্ড" : "Offline Paramedic Access"
                      )}
                    </span>
                  </div>
                </div>

                {/* Blood Group Badge */}
                <div className="text-center px-3 py-1 rounded-xl bg-red-500/15 border-2 border-red-500 text-red-400">
                  <span className="text-[9px] uppercase font-bold tracking-wider block">
                    {isBn ? "রক্ত" : "Blood"}
                  </span>
                  <span className="font-heading font-black text-base">{medicalId.bloodGroup}</span>
                </div>
              </div>

              {/* Patient Details */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted text-[10px] uppercase font-bold block">
                    {isBn ? "রোগীর নাম:" : "Patient Name:"}
                  </span>
                  <strong className="text-foreground text-sm font-heading">{medicalId.fullName}</strong>
                </div>

                <div className="p-2.5 rounded-xl bg-s2/40 border border-border/60 space-y-1">
                  <span className="text-muted text-[10px] uppercase font-bold block flex items-center gap-1">
                    <Phone className="h-3 w-3 text-emerald-400" />
                    {isBn ? "জরুরি যোগাযোগ:" : "Emergency Contact:"}
                  </span>
                  <p className="font-bold text-foreground">
                    {medicalId.emergencyContactName} —{" "}
                    <a href={`tel:${medicalId.emergencyContactPhone}`} className="text-emerald-400 hover:underline">
                      {medicalId.emergencyContactPhone}
                    </a>
                  </p>
                </div>

                {medicalId.allergies && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                    <span className="text-[10px] uppercase font-bold block flex items-center gap-1">
                      <AlertOctagon className="h-3 w-3 text-red-400" />
                      {isBn ? "মারাত্মক অ্যালার্জি:" : "Severe Allergies:"}
                    </span>
                    <strong className="text-xs">{medicalId.allergies}</strong>
                  </div>
                )}

                {medicalId.chronicConditions && (
                  <div>
                    <span className="text-muted text-[10px] uppercase font-bold block">
                      {isBn ? "ক্রনিক ডিজিজ:" : "Chronic Conditions:"}
                    </span>
                    <span className="text-foreground font-medium">{medicalId.chronicConditions}</span>
                  </div>
                )}
              </div>

              {/* Verifiable QR Code Matrix */}
              <div className="pt-3 border-t border-border/60 flex flex-col items-center justify-center space-y-2">
                <VerifiableQrCode
                  value={qrDataString}
                  size={150}
                  label={isBn ? "প্যারামেডিক / রেসকিউ স্ক্যানার" : "First Responder Quick Scan"}
                />
                <p className="text-[10px] font-mono text-center text-muted max-w-xs">
                  {isBn
                    ? "স্মার্টফোনের ক্যামেরা দিয়ে স্ক্যান করলে ইন্টারনেট ছাড়াই রক্তের গ্রুপ ও জরুরি যোগাযোগের ফোন নম্বর ডিকোড হবে।"
                    : "Instant scan decodes blood type, chronic conditions, and emergency phone offline."}
                </p>
              </div>

              {/* Card Actions */}
              <div className="pt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  icon={Printer}
                  onClick={() => window.print()}
                >
                  {isBn ? "মানিব্যাগ কার্ড প্রিন্ট" : "Print Wallet Card"}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  onClick={() => setIsEditingId(true)}
                >
                  {isBn ? "সম্পাদনা করুন" : "Edit Card"}
                </Button>
              </div>
            </div>
          ) : (
            /* Condition 3: Empty Card State — No Dummy User shown! */
            <div className="rounded-2xl border-2 border-dashed border-emerald-500/40 bg-card p-6 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <QrCode className="h-7 w-7" />
              </div>

              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="font-heading font-black text-base text-foreground">
                  {isBn ? "কোনো মেডিকেল আইডি সংরক্ষিত নেই" : "No Medical ID Configured"}
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  {isBn
                    ? "জরুরি অবস্থায় প্যারামেডিকদের সহায়তার জন্য আপনার নিজস্ব রক্তের গ্রুপ ও জরুরি যোগাযোগ নম্বর দিয়ে অফলাইন আইডি কার্ড তৈরি করুন, অথবা পেশেন্ট একাউন্টে লগইন করে সরাসরি সিঙ্ক করুন।"
                    : "Create your personal emergency medical ID card with blood group and emergency contact, or sign in as a verified patient to sync automatically."}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  onClick={() => {
                    setMedicalId(EMPTY_MEDICAL_ID);
                    setIsEditingId(true);
                  }}
                >
                  {isBn ? "নতুন মেডিকেল আইডি তৈরি করুন" : "Create Emergency Card"}
                </Button>
                {!isLoggedIn && (
                  <Link href="/login?next=/emergency">
                    <Button size="sm" variant="secondary" icon={LogIn}>
                      {isBn ? "পেশেন্ট লগইন করুন" : "Sign In to Sync"}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
