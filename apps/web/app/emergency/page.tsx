"use client";
import { EmergencyBanner } from "@/components/ui";
// Works without login and without any API call: emergency help must never depend on the network or an account.
export default function Emergency() { return <div className="py-6"><EmergencyBanner /></div>; }
