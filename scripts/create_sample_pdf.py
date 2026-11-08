import os
from datetime import datetime
import fitz

pdf_path = r"d:\medibridge-ai\medibridge\Sample_Patient_Medical_Report.pdf"
web_pdf_path = r"d:\medibridge-ai\medibridge\apps\web\public\sample_reports\Sample_Patient_Medical_Report.pdf"

doc = fitz.open()
page = doc.new_page(width=595, height=842)  # Standard A4 size

# 1. Header Clinic Banner
page.draw_rect(fitz.Rect(35, 30, 560, 95), color=(0.04, 0.45, 0.32), fill=(0.04, 0.45, 0.32))
page.insert_text((50, 58), "POPULAR DIAGNOSTIC & CLINICAL RESEARCH CENTRE", fontsize=13, color=(1, 1, 1), fontname="helv")
page.insert_text((50, 75), "House #16, Road #2, Dhanmondi R/A, Dhaka-1205 · DGHS Reg: LAB-DHK-2024-889", fontsize=8.5, color=(0.9, 0.96, 0.92), fontname="helv")
page.insert_text((50, 87), "Phone: +880-2-9669480 · Hotline: 10636 · Web: www.populardiagnostic.com", fontsize=8, color=(0.8, 0.9, 0.85), fontname="helv")

# 2. Patient Demographics Box
page.draw_rect(fitz.Rect(35, 105, 560, 180), color=(0.75, 0.82, 0.88), fill=(0.97, 0.98, 1.0))
page.insert_text((50, 124), "Patient Name: Mohammad Anisur Rahman", fontsize=9.5, fontname="helv", color=(0.1, 0.1, 0.1))
page.insert_text((50, 140), "Age / Sex   : 36 Yrs / Male", fontsize=9, fontname="helv", color=(0.25, 0.25, 0.25))
page.insert_text((50, 156), "Patient ID  : MB-PAT-2026-001", fontsize=9, fontname="helv", color=(0.25, 0.25, 0.25))
page.insert_text((50, 172), "Referred By : Dr. Rahim Ahmed (MBBS, FCPS)", fontsize=8.5, fontname="helv", color=(0.04, 0.45, 0.32))

page.insert_text((320, 124), "Sample Type   : Whole Blood (EDTA) & Fluoride", fontsize=9, fontname="helv", color=(0.1, 0.1, 0.1))
page.insert_text((320, 140), "Collection Date: " + datetime.now().strftime("%d-%b-%Y 08:30 AM"), fontsize=9, fontname="helv", color=(0.25, 0.25, 0.25))
page.insert_text((320, 156), "Reporting Date : " + datetime.now().strftime("%d-%b-%Y 11:45 AM"), fontsize=9, fontname="helv", color=(0.25, 0.25, 0.25))
page.insert_text((320, 172), "Report Status  : Final Verified", fontsize=9, fontname="helv", color=(0.04, 0.45, 0.32))

# 3. Section Title 1: Complete Blood Count (CBC)
page.draw_rect(fitz.Rect(35, 195, 560, 215), color=(0.88, 0.92, 0.96), fill=(0.88, 0.92, 0.96))
page.insert_text((50, 209), "DEPARTMENT OF HEMATOLOGY — COMPLETE BLOOD COUNT (CBC)", fontsize=9, fontname="helv", color=(0.1, 0.2, 0.4))

# Table Header
y = 230
page.draw_rect(fitz.Rect(35, y - 12, 560, y + 8), color=(0.82, 0.85, 0.88), fill=(0.94, 0.95, 0.97))
page.insert_text((50, y), "TEST PARAMETER                 RESULT    UNIT       REFERENCE RANGE", fontsize=8.5, fontname="courier", color=(0.2, 0.2, 0.2))

tests_cbc = [
    ("Hemoglobin", "13.8", "g/dL", "12.0 - 16.0"),
    ("Total WBC", "7.4", "10^9/L", "4.0 - 11.0"),
    ("Platelet count", "260", "10^9/L", "150 - 450"),
    ("RBC count", "4.85", "10^12/L", "4.2 - 5.8"),
    ("Hematocrit (PCV)", "42.0", "%", "36.0 - 48.0"),
    ("MCV", "86.5", "fL", "80.0 - 100.0"),
]

y += 24
for name, val, unit, ref in tests_cbc:
    page.draw_line(fitz.Point(35, y + 6), fitz.Point(560, y + 6), color=(0.92, 0.92, 0.92))
    line_str = f"{name:<28} {val:>6}  {unit:<10} {ref}"
    page.insert_text((50, y), line_str, fontsize=9.5, fontname="courier", color=(0.04, 0.45, 0.32))
    y += 22

# 4. Section Title 2: Clinical Biochemistry (Blood Glucose)
y += 15
page.draw_rect(fitz.Rect(35, y, 560, y + 20), color=(0.88, 0.92, 0.96), fill=(0.88, 0.92, 0.96))
page.insert_text((50, y + 14), "DEPARTMENT OF CLINICAL BIOCHEMISTRY — BLOOD GLUCOSE", fontsize=9, fontname="helv", color=(0.1, 0.2, 0.4))

y += 35
page.draw_rect(fitz.Rect(35, y - 12, 560, y + 8), color=(0.82, 0.85, 0.88), fill=(0.94, 0.95, 0.97))
page.insert_text((50, y), "TEST PARAMETER                 RESULT    UNIT       REFERENCE RANGE", fontsize=8.5, fontname="courier", color=(0.2, 0.2, 0.2))

tests_glu = [
    ("Blood Glucose (Fasting)", "98.0", "mg/dL", "70.0 - 100.0"),
    ("Blood Glucose (Post-Meal)", "135.0", "mg/dL", "70.0 - 140.0"),
]

y += 24
for name, val, unit, ref in tests_glu:
    page.draw_line(fitz.Point(35, y + 6), fitz.Point(560, y + 6), color=(0.92, 0.92, 0.92))
    line_str = f"{name:<28} {val:>6}  {unit:<10} {ref}"
    page.insert_text((50, y), line_str, fontsize=9.5, fontname="courier", color=(0.04, 0.45, 0.32))
    y += 22

# 5. Advisory & Signatures
y += 25
page.draw_rect(fitz.Rect(35, y, 560, y + 70), color=(0.85, 0.88, 0.92), fill=(0.98, 0.99, 1.0))
page.insert_text((50, y + 18), "CLINICAL VERIFICATION & INTERPRETATION ADVISORY:", fontsize=8.5, fontname="helv", color=(0.1, 0.2, 0.4))
page.insert_text((50, y + 34), "• Calibrated for MediBridge AI OCR & dual-gate validation. Evaluated against BD clinical reference ranges.", fontsize=8, fontname="helv", color=(0.35, 0.35, 0.35))
page.insert_text((50, y + 48), "• Laboratory findings must be correlated with clinical history and examined by a registered physician (BMDC).", fontsize=8, fontname="helv", color=(0.35, 0.35, 0.35))
page.insert_text((50, y + 60), "• QR Verification: https://medibridge.dev/verify/report/MB-PAT-2026-001", fontsize=8, fontname="helv", color=(0.04, 0.45, 0.32))

y += 105
page.draw_line(fitz.Point(50, y), fitz.Point(180, y), color=(0.5, 0.5, 0.5))
page.insert_text((60, y + 14), "Medical Technologist", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))
page.insert_text((60, y + 26), "Dept. of Laboratory Medicine", fontsize=7.5, fontname="helv", color=(0.4, 0.4, 0.4))

page.draw_line(fitz.Point(380, y), fitz.Point(540, y), color=(0.5, 0.5, 0.5))
page.insert_text((390, y + 14), "Dr. S. K. Roy (MBBS, M.Phil)", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))
page.insert_text((390, y + 26), "Consultant Pathologist & Lab Director", fontsize=7.5, fontname="helv", color=(0.4, 0.4, 0.4))

os.makedirs(os.path.dirname(web_pdf_path), exist_ok=True)
doc.save(pdf_path)
doc.save(web_pdf_path)
doc.close()
print("SUCCESS: Generated Sample_Patient_Medical_Report.pdf at", pdf_path)
