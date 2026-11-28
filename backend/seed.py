"""
Seed script: populate the database with FPT University academic data.
Run from backend/ directory:
    python seed.py

Target: DATABASE_URL in environment (or SQLite fallback for local dev)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.database.base import Base
from app.database.session import engine, SessionLocal
from app.database.models import *  # noqa: F401, F403

# ─────────────────────────── Campuses ───────────────────────────
CAMPUSES = [
    {"code": "HN",  "name": "Hà Nội"},
    {"code": "DN",  "name": "Đà Nẵng"},
    {"code": "HCM", "name": "TP. Hồ Chí Minh"},
    {"code": "QN",  "name": "Quy Nhơn"},
    {"code": "CT",  "name": "Cần Thơ"},
]

# ─────────────────────────── Semesters ──────────────────────────
from datetime import date

SEMESTERS = [
    {"code": "SP2025", "name": "Spring 2025",
     "start_date": date(2025, 1, 6), "end_date": date(2025, 5, 16), "is_active": False},
    {"code": "SU2025", "name": "Summer 2025",
     "start_date": date(2025, 5, 19), "end_date": date(2025, 9, 5), "is_active": False},
    {"code": "FA2025", "name": "Fall 2025",
     "start_date": date(2025, 9, 8), "end_date": date(2026, 1, 9), "is_active": False},
    {"code": "SP2026", "name": "Spring 2026",
     "start_date": date(2026, 1, 12), "end_date": date(2026, 5, 15), "is_active": False},
    {"code": "SU2026", "name": "Summer 2026",
     "start_date": date(2026, 5, 18), "end_date": date(2026, 9, 4), "is_active": False},
    {"code": "FA2026", "name": "Fall 2026",
     "start_date": date(2026, 9, 7), "end_date": date(2027, 1, 2), "is_active": False},
    {"code": "SP2027", "name": "Spring 2027",
     "start_date": date(2027, 1, 4), "end_date": date(2027, 5, 15), "is_active": True},
]

# ─────────────────────────── Courses ────────────────────────────
# Full FPT University course list (270+ courses)
COURSES = [
    # English & Language
    {"code": "TRS601",    "name": "Translation Studies 601",                    "credits": 3},
    {"code": "ENT303",    "name": "English for Technology 303",                 "credits": 3},
    {"code": "ENT203",    "name": "English for Technology 203",                 "credits": 3},
    {"code": "ENT503",    "name": "English for Technology 503",                 "credits": 3},
    {"code": "ENT403",    "name": "English for Technology 403",                 "credits": 3},
    {"code": "TRANS5",    "name": "Translation 5",                              "credits": 3},
    {"code": "TRANS4",    "name": "Translation 4",                              "credits": 3},
    {"code": "EPT202",    "name": "English Proficiency Training 202",           "credits": 3},
    {"code": "ENT104",    "name": "English for Technology 104",                 "credits": 3},
    {"code": "COV121",    "name": "Communication & Vietnamese 121",             "credits": 3},
    {"code": "COV111",    "name": "Communication & Vietnamese 111",             "credits": 3},
    {"code": "ENT404",    "name": "English for Technology 404",                 "credits": 3},
    {"code": "ENT304",    "name": "English for Technology 304",                 "credits": 3},
    {"code": "ENT103",    "name": "English for Technology 103",                 "credits": 3},
    {"code": "COV131",    "name": "Communication & Vietnamese 131",             "credits": 3},
    {"code": "VNC104",    "name": "Vietnamese Communication 104",               "credits": 3},
    {"code": "ENP102",    "name": "English Pronunciation 102",                  "credits": 3},
    {"code": "ENM301",    "name": "English for Marketing 301",                  "credits": 3},
    {"code": "ENM302",    "name": "English for Marketing 302",                  "credits": 3},
    {"code": "ENM401",    "name": "English for Marketing 401",                  "credits": 3},
    {"code": "ENM402",    "name": "English for Marketing 402",                  "credits": 3},
    {"code": "ENH301",    "name": "English for Hospitality 301",                "credits": 3},
    {"code": "EAW211",    "name": "English Academic Writing 211",               "credits": 3},
    {"code": "ENH401",    "name": "English for Hospitality 401",                "credits": 3},
    {"code": "EAW221",    "name": "English Academic Writing 221",               "credits": 3},
    {"code": "EAL201",    "name": "English for Academic & Legal 201",           "credits": 3},
    {"code": "ERW411",    "name": "English Research Writing 411",               "credits": 3},
    {"code": "ERW421",    "name": "English Research Writing 421",               "credits": 3},
    {"code": "EAW301",    "name": "English Academic Writing 301",               "credits": 3},
    {"code": "ERW413",    "name": "English Research Writing 413",               "credits": 3},
    {"code": "ENG303",    "name": "English 303",                                "credits": 3},
    {"code": "ENB301",    "name": "English for Business 301",                   "credits": 3},
    {"code": "ENB302",    "name": "English for Business 302",                   "credits": 3},
    {"code": "EBN301",    "name": "English for Business Negotiation 301",       "credits": 3},
    {"code": "ELT301",    "name": "English Language Teaching 301",              "credits": 3},
    {"code": "ELT401",    "name": "English Language Teaching 401",              "credits": 3},
    {"code": "ELT402",    "name": "English Language Teaching 402",              "credits": 3},

    # Japanese
    {"code": "JPD126",    "name": "Japanese 126",                               "credits": 3},
    {"code": "JPD226",    "name": "Japanese 226",                               "credits": 3},
    {"code": "JPD216",    "name": "Japanese 216",                               "credits": 3},
    {"code": "JPD113",    "name": "Japanese 113",                               "credits": 3},
    {"code": "JPD123",    "name": "Japanese 123",                               "credits": 3},
    {"code": "JPD133",    "name": "Japanese 133",                               "credits": 3},
    {"code": "JPD316",    "name": "Japanese 316",                               "credits": 3},
    {"code": "JPD326",    "name": "Japanese 326",                               "credits": 3},
    {"code": "JPD336",    "name": "Japanese 336",                               "credits": 3},
    {"code": "JPD346",    "name": "Japanese 346",                               "credits": 3},
    {"code": "JPE301",    "name": "Japanese for Engineering 301",               "credits": 3},
    {"code": "JIG301",    "name": "Japanese IT Global 301",                     "credits": 3},
    {"code": "JBT301",    "name": "Japanese Business Training 301",             "credits": 3},
    {"code": "JBI301",    "name": "Japanese Business Intelligence 301",         "credits": 3},
    {"code": "JJB391",    "name": "Japanese Job Bridge 391",                    "credits": 3},
    {"code": "JSC301",    "name": "Japanese Science & Culture 301",             "credits": 3},
    {"code": "JTE301",    "name": "Japanese Technical Engineering 301",         "credits": 3},
    {"code": "JIT301",    "name": "Japanese IT 301",                            "credits": 3},
    {"code": "JIT401",    "name": "Japanese IT 401",                            "credits": 3},
    {"code": "JIT491",    "name": "Japanese IT 491",                            "credits": 3},
    {"code": "JIS401",    "name": "Japanese IT Systems 401",                    "credits": 3},
    {"code": "JLR302",    "name": "Japanese Language Research 302",             "credits": 3},
    {"code": "JFE301",    "name": "Japanese for Engineers 301",                 "credits": 3},
    {"code": "JMP501",    "name": "Japanese Management Practice 501",           "credits": 3},
    {"code": "JDC501",    "name": "Japanese Digital Communication 501",         "credits": 3},
    {"code": "JJL301",    "name": "Japanese Job & Life 301",                    "credits": 3},

    # Korean
    {"code": "KOR311",    "name": "Korean 311",                                 "credits": 3},
    {"code": "KOR321",    "name": "Korean 321",                                 "credits": 3},
    {"code": "KOR411",    "name": "Korean 411",                                 "credits": 3},
    {"code": "KOI401",    "name": "Korean IT 401",                              "credits": 3},

    # Chinese
    {"code": "CHN111",    "name": "Chinese 111",                                "credits": 3},
    {"code": "CHN113",    "name": "Chinese 113",                                "credits": 3},
    {"code": "CHN122",    "name": "Chinese 122",                                "credits": 3},
    {"code": "CHN123",    "name": "Chinese 123",                                "credits": 3},
    {"code": "CHI121",    "name": "Chinese Intermediate 121",                   "credits": 3},
    {"code": "CHI331",    "name": "Chinese Advanced 331",                       "credits": 3},
    {"code": "CHG401",    "name": "Chinese for Global Business 401",            "credits": 3},

    # Programming & Computing
    {"code": "PRF192",    "name": "Programming Fundamentals",                   "credits": 3},
    {"code": "PFP191",    "name": "Principles of Functional Programming 191",   "credits": 3},
    {"code": "PRF193",    "name": "Programming Fundamentals 193",               "credits": 3},
    {"code": "PRO192",    "name": "Programming OOP",                            "credits": 3},
    {"code": "PRN212",    "name": "Programming .NET 212",                       "credits": 3},
    {"code": "PRN211",    "name": "Programming .NET 211",                       "credits": 3},
    {"code": "PRN222",    "name": "Programming .NET 222",                       "credits": 3},
    {"code": "PRN221",    "name": "Programming .NET 221",                       "credits": 3},
    {"code": "PRN231",    "name": "Programming .NET 231",                       "credits": 3},
    {"code": "PRN232",    "name": "Programming .NET 232",                       "credits": 3},
    {"code": "PRU211m",   "name": "Programming Unity 211",                      "credits": 3},
    {"code": "PRU212",    "name": "Programming Unity 212",                      "credits": 3},
    {"code": "PRU213",    "name": "Programming Unity 213",                      "credits": 3},
    {"code": "PRW301",    "name": "Programming Web 301",                        "credits": 3},
    {"code": "PWD301",    "name": "Programming Web Design 301",                 "credits": 3},
    {"code": "WDP301",    "name": "Web Development & Programming 301",          "credits": 3},
    {"code": "WMC201",    "name": "Web & Mobile Commerce 201",                  "credits": 3},
    {"code": "WBS200",    "name": "Web-Based Systems 200",                      "credits": 3},
    {"code": "WBS220",    "name": "Web-Based Systems 220",                      "credits": 3},
    {"code": "SWC201",    "name": "Software Construction 201",                  "credits": 3},
    {"code": "SWR302",    "name": "Software Requirements 302",                  "credits": 3},
    {"code": "SWT301",    "name": "Software Testing 301",                       "credits": 3},
    {"code": "SWD391",    "name": "Software Development 391",                   "credits": 3},
    {"code": "SWD392",    "name": "Software Development 392",                   "credits": 3},
    {"code": "SWP391",    "name": "Software Project 391",                       "credits": 3},
    {"code": "SPM401",    "name": "Software Project Management 401",            "credits": 3},
    {"code": "SEG301",    "name": "Software Engineering & Graphics 301",        "credits": 3},

    # Computer Science / IT Core
    {"code": "CEA201",    "name": "Computer Organization & Architecture",       "credits": 3},
    {"code": "CSI104",    "name": "Computer Science Introduction 104",          "credits": 3},
    {"code": "CSI105",    "name": "Computer Science Introduction 105",          "credits": 3},
    {"code": "CSI106",    "name": "Computer Science Introduction 106",          "credits": 3},
    {"code": "CSP201m",   "name": "Computer Science Practice 201",              "credits": 3},
    {"code": "CSP202m",   "name": "Computer Science Practice 202",              "credits": 3},
    {"code": "CSR301",    "name": "Computer Science Research 301",              "credits": 3},
    {"code": "OSG202",    "name": "Operating Systems",                          "credits": 3},
    {"code": "OSG203",    "name": "Operating Systems 203",                      "credits": 3},
    {"code": "OSP201",    "name": "Operating Systems Practice 201",             "credits": 3},
    {"code": "MAD101",    "name": "Discrete Mathematics",                       "credits": 3},
    {"code": "MAE101",    "name": "Mathematics for Engineering 101",            "credits": 3},
    {"code": "MAI391",    "name": "Mathematics & AI 391",                       "credits": 3},
    {"code": "MMA301",    "name": "Mathematics & Machine Learning 301",         "credits": 3},

    # Database
    {"code": "DBI202",    "name": "Database Introduction 202",                  "credits": 3},
    {"code": "DBM301",    "name": "Database Management",                        "credits": 3},
    {"code": "DBM302m",   "name": "Database Management 302",                    "credits": 3},
    {"code": "DBS401",    "name": "Database Systems 401",                       "credits": 3},
    {"code": "DBW301",    "name": "Database for Web 301",                       "credits": 3},
    {"code": "DAT301m",   "name": "Data Analytics 301",                         "credits": 3},
    {"code": "DTA301",    "name": "Data Analysis 301",                          "credits": 3},
    {"code": "DAP391m",   "name": "Data Analytics Project 391",                 "credits": 3},
    {"code": "DMS301m",   "name": "Data Management Systems 301",                "credits": 3},
    {"code": "DMS302m",   "name": "Data Management Systems 302",                "credits": 3},
    {"code": "DSR301",    "name": "Data Science Research 301",                  "credits": 3},
    {"code": "DSR301m",   "name": "Data Science Research 301m",                 "credits": 3},
    {"code": "DSS301",    "name": "Decision Support Systems 301",               "credits": 3},
    {"code": "DTG102",    "name": "Data Technology & Graphics 102",             "credits": 3},
    {"code": "DTG303",    "name": "Data Technology & Graphics 303",             "credits": 3},
    {"code": "DGC301",    "name": "Digital & Graphics Computing 301",           "credits": 3},
    {"code": "DGT302",    "name": "Digital Technology 302",                     "credits": 3},
    {"code": "DCD301",    "name": "Data Collection & Design 301",               "credits": 3},

    # Networks & Security
    {"code": "NWC204",    "name": "Network Computing 204",                      "credits": 3},
    {"code": "NWC303",    "name": "Network Computing 303",                      "credits": 3},
    {"code": "SDN301m",   "name": "Software-Defined Networking 301",            "credits": 3},
    {"code": "SDN302",    "name": "Software-Defined Networking 302",            "credits": 3},
    {"code": "ISC301",    "name": "Information Security 301",                   "credits": 3},
    {"code": "ISC302",    "name": "Information Security 302",                   "credits": 3},
    {"code": "ISP392",    "name": "Information Security Project 392",           "credits": 3},
    {"code": "IAA202",    "name": "IT Architecture & Analysis 202",             "credits": 3},
    {"code": "IAM302",    "name": "IT Architecture Management 302",             "credits": 3},
    {"code": "IAM302t",   "name": "IT Architecture Management 302t",            "credits": 3},
    {"code": "IAO202",    "name": "IT Architecture Operations 202",             "credits": 3},
    {"code": "IAP301",    "name": "IT Architecture Practice 301",               "credits": 3},
    {"code": "IAW301",    "name": "IT Architecture for Web 301",                "credits": 3},
    {"code": "ICI211",    "name": "IT Cloud Infrastructure 211",                "credits": 3},

    # AI & Machine Learning
    {"code": "AIL302m",   "name": "AI & Learning 302",                          "credits": 3},
    {"code": "AIL303m",   "name": "AI & Learning 303",                          "credits": 3},
    {"code": "AIL304m",   "name": "AI & Learning 304",                          "credits": 3},
    {"code": "AIC211",    "name": "AI Computing 211",                           "credits": 3},
    {"code": "AIE301m",   "name": "AI Engineering 301",                         "credits": 3},
    {"code": "AIH301m",   "name": "AI for Healthcare 301",                      "credits": 3},
    {"code": "AIM301m",   "name": "AI Management 301",                          "credits": 3},
    {"code": "AIT301",    "name": "AI Technology 301",                          "credits": 3},
    {"code": "ADS301m",   "name": "AI & Data Science 301",                      "credits": 3},
    {"code": "ADY201m",   "name": "AI & Data Analysis 201",                     "credits": 3},

    # IoT & Embedded
    {"code": "IOT102",    "name": "Internet of Things 102",                     "credits": 3},
    {"code": "ELC201",    "name": "Electronics & Computing 201",                "credits": 3},
    {"code": "EEI101",    "name": "Electrical Engineering Introduction 101",    "credits": 3},
    {"code": "ERP301",    "name": "ERP Systems 301",                            "credits": 3},

    # Software Architecture / Cloud / SAP
    {"code": "SAP311",    "name": "SAP 311",                                    "credits": 3},
    {"code": "SAP312",    "name": "SAP 312",                                    "credits": 3},
    {"code": "SAP321",    "name": "SAP 321",                                    "credits": 3},
    {"code": "SAP331",    "name": "SAP 331",                                    "credits": 3},
    {"code": "SAP341",    "name": "SAP 341",                                    "credits": 3},
    {"code": "SDP201",    "name": "Software Development Practice 201",          "credits": 3},
    {"code": "SDI101m",   "name": "Software Development Introduction 101",      "credits": 3},
    {"code": "SDI301m",   "name": "Software Development Intermediate 301",      "credits": 3},

    # Project / Capstone
    {"code": "PRJ301",    "name": "Project 301",                                "credits": 3},
    {"code": "PRJ302",    "name": "Project 302",                                "credits": 3},
    {"code": "PRM392",    "name": "Project Management 392",                     "credits": 3},
    {"code": "PRM393",    "name": "Project Management 393",                     "credits": 3},
    {"code": "PCP291",    "name": "Project & Capstone Preparation 291",         "credits": 3},
    {"code": "PST202",    "name": "Project & Systems Thinking 202",             "credits": 3},

    # Business / Management
    {"code": "MKT101",    "name": "Marketing 101",                              "credits": 3},
    {"code": "MKT201",    "name": "Marketing 201",                              "credits": 3},
    {"code": "MKT202",    "name": "Marketing 202",                              "credits": 3},
    {"code": "MKT301",    "name": "Marketing 301",                              "credits": 3},
    {"code": "MKT304",    "name": "Marketing Management 304",                   "credits": 3},
    {"code": "MKT309m",   "name": "Marketing 309",                              "credits": 3},
    {"code": "MKT209m",   "name": "Marketing 209",                              "credits": 3},
    {"code": "MKG101",    "name": "Marketing & Global 101",                     "credits": 3},
    {"code": "MMK101",    "name": "Modern Marketing 101",                       "credits": 3},
    {"code": "MKC201m",   "name": "Marketing Content 201",                      "credits": 3},
    {"code": "IMC301",    "name": "Integrated Marketing Communications 301",    "credits": 3},
    {"code": "IMP301",    "name": "Import & Marketing Practice 301",            "credits": 3},
    {"code": "MGT103",    "name": "Management 103",                             "credits": 3},
    {"code": "ISM201",    "name": "Information Systems Management 201",         "credits": 3},
    {"code": "ISM302",    "name": "Information Systems Management 302",         "credits": 3},
    {"code": "IOM201",    "name": "International Operations Management 201",    "credits": 3},
    {"code": "IBC201",    "name": "International Business Communication 201",   "credits": 3},
    {"code": "IBF301",    "name": "International Business Finance 301",         "credits": 3},
    {"code": "IBI101",    "name": "Introduction to Business Intelligence 101",  "credits": 3},
    {"code": "IIV301",    "name": "Innovation & Investment 301",                "credits": 3},
    {"code": "IIP301",    "name": "Innovation & Investment Practice 301",       "credits": 3},
    {"code": "TMG301",    "name": "Technology Management 301",                  "credits": 3},
    {"code": "MCO201",    "name": "Management & Consulting 201",                "credits": 3},
    {"code": "MCO302",    "name": "Management & Consulting 302",                "credits": 3},
    {"code": "MCP201",    "name": "Management Control & Planning 201",          "credits": 3},
    {"code": "MCE201",    "name": "Management & Corporate Ethics 201",          "credits": 3},
    {"code": "MCL201",    "name": "Management & Corporate Leadership 201",      "credits": 3},
    {"code": "MMS301",    "name": "Media Management Systems 301",               "credits": 3},
    {"code": "MMA301",    "name": "Marketing & Media Analytics 301",            "credits": 3},
    {"code": "MMP201",    "name": "Multimedia Project 201",                     "credits": 3},
    {"code": "MPL201",    "name": "Management & Planning 201",                  "credits": 3},
    {"code": "MSA201",    "name": "Marketing & Strategic Analysis 201",         "credits": 3},
    {"code": "MSS301",    "name": "Management Support Systems 301",             "credits": 3},

    # Finance / Accounting / Economics
    {"code": "ECO111",    "name": "Economics 111",                              "credits": 3},
    {"code": "ECO102",    "name": "Economics 102",                              "credits": 3},
    {"code": "ECO121",    "name": "Economics 121",                              "credits": 3},
    {"code": "ECO201",    "name": "Economics 201",                              "credits": 3},
    {"code": "FIN201",    "name": "Finance 201",                                "credits": 3},
    {"code": "FIN202",    "name": "Finance 202",                                "credits": 3},
    {"code": "FIN301",    "name": "Finance 301",                                "credits": 3},
    {"code": "FIN303",    "name": "Financial Management 303",                   "credits": 3},
    {"code": "FIN307",    "name": "Financial Management 307",                   "credits": 3},
    {"code": "FIN308",    "name": "Financial Management 308",                   "credits": 3},
    {"code": "FIN402",    "name": "Finance 402",                                "credits": 3},
    {"code": "FIM202",    "name": "Financial Information Management 202",       "credits": 3},
    {"code": "FBM201",    "name": "Financial & Business Management 201",        "credits": 3},
    {"code": "FAP201",    "name": "Financial Accounting Practice 201",          "credits": 3},
    {"code": "FAC201",    "name": "Financial Accounting 201",                   "credits": 3},
    {"code": "FBM201",    "name": "Financial & Business Management 201",        "credits": 3},
    {"code": "ACC101",    "name": "Accounting 101",                             "credits": 3},
    {"code": "ACC302",    "name": "Accounting 302",                             "credits": 3},
    {"code": "ACC305",    "name": "Accounting 305",                             "credits": 3},
    {"code": "BCP201",    "name": "Business Computing Practice 201",            "credits": 3},
    {"code": "BKG302",    "name": "Banking 302",                                "credits": 3},
    {"code": "BKG303",    "name": "Banking 303",                                "credits": 3},
    {"code": "BPS301",    "name": "Business Process & Strategy 301",            "credits": 3},
    {"code": "BRA301",    "name": "Brand Management 301",                       "credits": 3},

    # Supply Chain / Logistics / Operations
    {"code": "SCM201",    "name": "Supply Chain Management 201",                "credits": 3},
    {"code": "SCM202",    "name": "Supply Chain Management 202",                "credits": 3},
    {"code": "SCM301m",   "name": "Supply Chain Management 301",                "credits": 3},
    {"code": "SCM302",    "name": "Supply Chain Management 302",                "credits": 3},
    {"code": "LOG311",    "name": "Logistics 311",                              "credits": 3},
    {"code": "LOG321",    "name": "Logistics 321",                              "credits": 3},
    {"code": "LOS201",    "name": "Logistics Operations & Systems 201",         "credits": 3},
    {"code": "LOD212",    "name": "Logistics Operations & Design 212",          "credits": 3},
    {"code": "GLT301",    "name": "Global Logistics & Trade 301",               "credits": 3},
    {"code": "GLH301",    "name": "Global Healthcare Logistics 301",            "credits": 3},
    {"code": "GLC301",    "name": "Global Logistics & Commerce 301",            "credits": 3},
    {"code": "GLI201",    "name": "Global Logistics Introduction 201",          "credits": 3},
    {"code": "GLI202",    "name": "Global Logistics Introduction 202",          "credits": 3},
    {"code": "GLA301",    "name": "Global Logistics & Analytics 301",           "credits": 3},
    {"code": "GSF301",    "name": "Global Supply & Freight 301",                "credits": 3},
    {"code": "GEM201",    "name": "Global E-commerce Management 201",           "credits": 3},
    {"code": "GNS301",    "name": "Global Networks & Supply 301",               "credits": 3},
    {"code": "GDC301",    "name": "Global Distribution & Commerce 301",         "credits": 3},

    # Hospitality / Tourism
    {"code": "HOA102",    "name": "Hospitality Operations & Administration 102","credits": 3},
    {"code": "HOM202",    "name": "Hotel Operations Management 202",            "credits": 3},
    {"code": "FOM200",    "name": "Front Office Management 200",                "credits": 3},
    {"code": "HOD102",    "name": "Hotel Operations Design 102",                "credits": 3},
    {"code": "HOD401",    "name": "Hotel Operations Design 401",                "credits": 3},
    {"code": "HOD402",    "name": "Hotel Operations Design 402",                "credits": 3},
    {"code": "FRS301",    "name": "Food & Restaurant Service 301",              "credits": 3},
    {"code": "FER201m",   "name": "Food & Events Research 201",                 "credits": 3},
    {"code": "FER202",    "name": "Food & Events Research 202",                 "credits": 3},
    {"code": "TAB201",    "name": "Tourism & Business Administration 201",      "credits": 3},
    {"code": "FGU301",    "name": "Food & Guest Upselling 301",                 "credits": 3},

    # Design / Media / Art
    {"code": "DMA301m",   "name": "Digital Media & Arts 301",                   "credits": 3},
    {"code": "DPL301m",   "name": "Digital Publishing & Layout 301",            "credits": 3},
    {"code": "DPL302m",   "name": "Digital Publishing & Layout 302",            "credits": 3},
    {"code": "DIC201",    "name": "Digital & Interactive Communication 201",    "credits": 3},
    {"code": "DSP201",    "name": "Digital Signal Processing 201",              "credits": 3},
    {"code": "MMP201",    "name": "Multimedia Project 201",                     "credits": 3},
    {"code": "MMK101",    "name": "Modern Multimedia & Knowledge 101",          "credits": 3},
    {"code": "GDC301",    "name": "Graphic Design & Computing 301",             "credits": 3},
    {"code": "PEN401",    "name": "Photography & Editing 401",                  "credits": 3},
    {"code": "ACD301",    "name": "Art & Creative Design 301",                  "credits": 3},
    {"code": "AEE301",    "name": "Art, Engineering & Environment 301",         "credits": 3},
    {"code": "ATS301",    "name": "Art & Technology Studies 301",               "credits": 3},
    {"code": "AGU301",    "name": "Animation & Game UX 301",                    "credits": 3},
    {"code": "AUG301",    "name": "Animation UX & Graphics 301",                "credits": 3},

    # Communications / PR / Media
    {"code": "CCM301",    "name": "Corporate Communications Management 301",    "credits": 3},
    {"code": "CCO201",    "name": "Corporate Communications 201",               "credits": 3},
    {"code": "CAA201",    "name": "Communications, Advertising & Analysis 201", "credits": 3},
    {"code": "CAM201",    "name": "Communications & Media 201",                 "credits": 3},
    {"code": "CES202",    "name": "Communications & Event Studies 202",         "credits": 3},
    {"code": "COS201",    "name": "Communications & Online Studies 201",        "credits": 3},
    {"code": "CSD201",    "name": "Communication & System Design 201",          "credits": 3},
    {"code": "CSD202",    "name": "Communication & System Design 202",          "credits": 3},
    {"code": "CSD203",    "name": "Communication & System Design 203",          "credits": 3},
    {"code": "LTG202",    "name": "Language, Technology & Graphics 202",        "credits": 3},
    {"code": "LIT301",    "name": "Literature & IT 301",                        "credits": 3},
    {"code": "LAW102",    "name": "Law 102",                                    "credits": 3},
    {"code": "LAB211",    "name": "Lab 211",                                    "credits": 3},
    {"code": "LAE101",    "name": "Law & Ethics 101",                           "credits": 3},
    {"code": "LOS201",    "name": "Logistics Operations & Supply 201",          "credits": 3},

    # Social Science / General
    {"code": "SSA101",    "name": "Social Sciences & Arts 101",                 "credits": 3},
    {"code": "SSC101",    "name": "Social Sciences 101",                        "credits": 3},
    {"code": "SSC102",    "name": "Social Sciences 102",                        "credits": 3},
    {"code": "SSG104",    "name": "Social Sciences & Global 104",               "credits": 3},
    {"code": "SSG105",    "name": "Social Sciences & Global 105",               "credits": 3},
    {"code": "SSB201",    "name": "Social Sciences & Business 201",             "credits": 3},
    {"code": "SSN301",    "name": "Social Sciences & Networks 301",             "credits": 3},
    {"code": "SEM101",    "name": "Seminars & Entrepreneurship 101",            "credits": 3},
    {"code": "SBA301",    "name": "Strategic Business Analysis 301",            "credits": 3},
    {"code": "SAL301",    "name": "Sales & Leadership 301",                     "credits": 3},

    # Environment / Science
    {"code": "EVN201",    "name": "Environmental Science 201",                  "credits": 3},
    {"code": "EVN205",    "name": "Environmental Science 205",                  "credits": 3},
    {"code": "EVN301",    "name": "Environmental Science 301",                  "credits": 3},
    {"code": "ECR201",    "name": "E-Commerce Research 201",                    "credits": 3},
    {"code": "ECR202",    "name": "E-Commerce Research 202",                    "credits": 3},
    {"code": "ECR301",    "name": "E-Commerce Research 301",                    "credits": 3},
    {"code": "EBS211",    "name": "E-Business Systems 211",                     "credits": 3},
    {"code": "EBS311",    "name": "E-Business Systems 311",                     "credits": 3},
    {"code": "EBN301",    "name": "E-Business Networks 301",                    "credits": 3},

    # Healthcare / Pharma
    {"code": "HSK200",    "name": "Health Sciences & Knowledge 200",            "credits": 3},
    {"code": "HSF302",    "name": "Health Sciences & Finance 302",              "credits": 3},
    {"code": "HCM202",    "name": "Healthcare Management 202",                  "credits": 3},

    # Misc / Special
    {"code": "ASI101",    "name": "Asian Studies Introduction 101",             "credits": 3},
    {"code": "HOA102",    "name": "Hotel & Operations Administration 102",      "credits": 3},
    {"code": "IPR102",    "name": "Intellectual Property Rights 102",           "credits": 3},
    {"code": "IMA301",    "name": "Innovation Management & Analysis 301",       "credits": 3},
    {"code": "MIP201",    "name": "Management Information & Planning 201",      "credits": 3},
    {"code": "MLN101",    "name": "Machine Learning Networks 101",              "credits": 3},
    {"code": "MLN111",    "name": "Machine Learning Networks 111",              "credits": 3},
    {"code": "MLN122",    "name": "Machine Learning Networks 122",              "credits": 3},
    {"code": "MLN131",    "name": "Machine Learning Networks 131",              "credits": 3},
    {"code": "CPV301",    "name": "Computer Vision 301",                        "credits": 3},
    {"code": "REL301m",   "name": "Reinforcement Learning 301",                 "credits": 3},
    {"code": "RES213",    "name": "Research Methods 213",                       "credits": 3},
    {"code": "RES301",    "name": "Research Methods 301",                       "credits": 3},
    {"code": "RMB301",    "name": "Risk Management & Business 301",             "credits": 3},
    {"code": "RMB302",    "name": "Risk Management & Business 302",             "credits": 3},
    {"code": "RMC201",    "name": "Risk Management & Commerce 201",             "credits": 3},
    {"code": "RMC301m",   "name": "Risk Management & Commerce 301",             "credits": 3},
    {"code": "RMD301",    "name": "Risk Management & Data 301",                 "credits": 3},
    {"code": "SLP301",    "name": "Service Learning & Practice 301",            "credits": 3},
    {"code": "SDP201",    "name": "Strategic Development Practice 201",         "credits": 3},
    {"code": "TTM202",    "name": "Tourism & Travel Management 202",            "credits": 3},
    {"code": "TTM203",    "name": "Tourism & Travel Management 203",            "credits": 3},
    {"code": "TTS302",    "name": "Tourism & Travel Services 302",              "credits": 3},
    {"code": "VNR202",    "name": "Vietnamese Research 202",                    "credits": 3},
    {"code": "VNC104",    "name": "Vietnamese Communication 104",               "credits": 3},
    {"code": "KMS301",    "name": "Knowledge Management Systems 301",           "credits": 3},
    {"code": "IEI301",    "name": "Industrial Engineering Introduction 301",    "credits": 3},
    {"code": "ITA301",    "name": "IT Architecture 301",                        "credits": 3},
    {"code": "IPR102",    "name": "Intellectual Property Rights 102",           "credits": 3},
    {"code": "IBF301",    "name": "International Business Finance 301",         "credits": 3},
    {"code": "HOD402",    "name": "Hotel Operations Development 402",           "credits": 3},
    {"code": "FIN303",    "name": "Financial Management 303",                   "credits": 3},
    {"code": "EPR301",    "name": "Environmental Practice & Research 301",      "credits": 3},
    {"code": "DTG303",    "name": "Digital Technology & Graphics 303",          "credits": 3},
    {"code": "DSP201",    "name": "Digital Signal Processing 201",              "credits": 3},
    {"code": "DGT302",    "name": "Digital Technology 302",                     "credits": 3},
    {"code": "CCM301",    "name": "Corporate Communications Management 301",    "credits": 3},
    {"code": "AUG301",    "name": "Animation & UX Graphics 301",                "credits": 3},
    {"code": "MAS202",    "name": "Marketing & Analytics Studies 202",          "credits": 3},
    {"code": "MAS291",    "name": "Marketing & Analytics Studies 291",          "credits": 3},
    {"code": "IBSTPI001", "name": "International Business Strategy & Practice", "credits": 3},
    {"code": "PDS301m",   "name": "Product Design & Strategy 301",              "credits": 3},
    {"code": "PRE202",    "name": "Presentation & Research 202",                "credits": 3},
    {"code": "PRE301",    "name": "Presentation & Research 301",                "credits": 3},
    {"code": "FGU301",    "name": "Food & Guest Upselling 301",                 "credits": 3},
    {"code": "GEM201",    "name": "Global E-Commerce Management 201",           "credits": 3},
    {"code": "IAM302t",   "name": "IT Architecture Management 302t",            "credits": 3},

    # Physical Education / Vovinam
    {"code": "VOV112",    "name": "Vovinam 1",                                  "credits": 1},
    {"code": "VOV113",    "name": "Vovinam 1/3",                                "credits": 1},
    {"code": "VOV114",    "name": "Vovinam 1/3",                                "credits": 2},
    {"code": "VOV121",    "name": "Vovinam 2",                                  "credits": 2},
    {"code": "VOV122",    "name": "Vovinam 3",                                  "credits": 1},
    {"code": "VOV123",    "name": "Vovinam 2/3",                                "credits": 1},
    {"code": "VOV124",    "name": "Vovinam 2/3",                                "credits": 2},
    {"code": "VOV131",    "name": "Vovinam 5",                                  "credits": 1},
    {"code": "VOV132",    "name": "Vovinam 5",                                  "credits": 1},
    {"code": "VOV133",    "name": "Vovinam 6",                                  "credits": 1},
    {"code": "VOV134",    "name": "Vovinam 3/3",                                "credits": 2},
]


def run():
    from app.database.models.academic import Campus, Semester, Course

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # ── Campuses ──────────────────────────────────────────────────────────
        campus_map: dict[str, Campus] = {}
        for c in CAMPUSES:
            existing = db.query(Campus).filter(Campus.code == c["code"]).first()
            if not existing:
                obj = Campus(**c)
                db.add(obj)
                db.flush()
                campus_map[c["code"]] = obj
                print(f"  [+] Campus: {c['code']} — {c['name']}")
            else:
                if existing.name != c["name"]:
                    existing.name = c["name"]
                    print(f"  [~] Campus updated: {c['code']} — {c['name']}")
                else:
                    print(f"  [=] Campus exists: {c['code']}")
                campus_map[c["code"]] = existing

        # ── Semesters ─────────────────────────────────────────────────────────
        semester_map: dict[str, Semester] = {}
        for s in SEMESTERS:
            existing = db.query(Semester).filter(Semester.code == s["code"]).first()
            if not existing:
                obj = Semester(**s)
                db.add(obj)
                db.flush()
                semester_map[s["code"]] = obj
                print(f"  [+] Semester: {s['code']}")
            else:
                existing.name = s["name"]
                existing.start_date = s["start_date"]
                existing.end_date = s["end_date"]
                existing.is_active = s["is_active"]
                semester_map[s["code"]] = existing
                print(f"  [~] Semester synced: {s['code']} (active={s['is_active']})")

        # ── Courses (batch lookup + bulk insert) ──────────────────────────────
        course_map: dict[str, Course] = {
            c.code: c for c in db.query(Course).all()
        }
        seen_codes: set[str] = set()
        new_courses: list[Course] = []
        skipped_dup = 0
        for co in COURSES:
            if co["code"] in seen_codes:
                skipped_dup += 1
                continue
            seen_codes.add(co["code"])

            if co["code"] not in course_map:
                obj = Course(**co)
                new_courses.append(obj)
                course_map[co["code"]] = obj

        if new_courses:
            db.add_all(new_courses)
        added = len(new_courses)

        db.commit()
        print(f"\n  [+] Courses added: {added}")
        print(f"  [=] Courses already existed: {len(COURSES) - added - skipped_dup}")
        print(f"  [!] Duplicate codes in list (skipped): {skipped_dup}")
        print(f"  Total unique courses in DB: {len(course_map)}")
        print("\nSeed complete!")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding FPT ClassSwap database...")
    run()
