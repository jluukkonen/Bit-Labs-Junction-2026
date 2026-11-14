#!/usr/bin/env python3
"""
Generate 100 realistic Espoo TalentMatch applicants in data/applicants_sample.json.

Preserves the top 10 Hero profiles verbatim (including Dr. Tariq Al-Mansoor as #2)
and renumbers the original app-10 (Noora Lindstrom) to app-11, followed by app-12
through app-100 matching municipal cluster, evidence, and demographic targets:
  - Total: 100 applicants
  - Clusters: 25 Edge AI & Robotics, 25 Quantum & Semiconductors,
              20 CleanTech & Smart Grid, 15 Bio & HealthTech,
              15 Sovereign AI & Cloud Infra
  - Evidence: 30 Verified Public Code / Benchmark,
              35 Redacted Enterprise NDA Vignette,
              15 Peer-Reviewed Research / Poster,
              10 Applied Reasoning (Junior / Student),
              10 Self-Reported Claims Only (fluffIndex > 75, competenceScore < 30, flagged)
"""

from __future__ import annotations

import json
import random
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
APPLICANTS_PATH = ROOT / "data" / "applicants_sample.json"
METAVERSE_PATH = ROOT / "src" / "components" / "EspooMetaverse.tsx"

HERO_ORDER = [
    "app-01",
    "app-tariq",
    "app-04",
    "app-03",
    "app-06",
    "app-05",
    "app-07",
    "app-02",
    "app-08",
    "app-09",
]

CLUSTER_TARGETS = {
    "Edge AI & Robotics": 25,
    "Quantum & Semiconductors": 25,
    "CleanTech & Smart Grid": 20,
    "Bio & HealthTech": 15,
    "Sovereign AI & Cloud Infra": 15,
}

EVIDENCE_TARGETS = {
    "Verified Public Code / Benchmark": 30,
    "Redacted Enterprise NDA Vignette": 35,
    "Peer-Reviewed Research / Poster": 15,
    "Applied Reasoning (Junior / Student)": 10,
    "Self-Reported Claims Only": 10,
}

SPAMMER_TARGETS_BY_CLUSTER = {
    "Edge AI & Robotics": 2,
    "Quantum & Semiconductors": 2,
    "CleanTech & Smart Grid": 2,
    "Bio & HealthTech": 2,
    "Sovereign AI & Cloud Infra": 2,
}

CLUSTER_RADAR_CENTERS = {
    "Edge AI & Robotics": (32, 72),
    "Quantum & Semiconductors": (72, 74),
    "CleanTech & Smart Grid": (30, 32),
    "Bio & HealthTech": (70, 30),
    "Sovereign AI & Cloud Infra": (50, 52),
}


def build_fallback_tariq() -> dict[str, Any]:
    return {
        "id": "app-tariq",
        "name": "Dr. Tariq Al-Mansoor",
        "role": "Principal RISC-V Vector & Edge Silicon Architect",
        "origin": "Keilaniemi, Espoo · Former ETH & IMEC",
        "avatarInitials": "TM",
        "persona": "Builder / Engineer",
        "cluster": "Edge AI & Robotics",
        "competenceScore": 95,
        "legacyLinkedInScore": 63,
        "fluffIndex": 7,
        "evidenceCategory": "Verified Public Code / Benchmark",
        "alignmentType": "Direct Bottleneck Match",
        "demonstratedMechanism": (
            "Authored custom RISC-V RVV 1.0 vector shadow-register interrupt "
            "switching reducing worst-case ISR cache jitter from 240ns to 18ns "
            "on 22nm FDSOI edge silicon."
        ),
        "status": "approved",
        "reviewedBy": "Marika K. (City of Espoo)",
        "reviewedAt": "2026-11-13 21:00",
        "humanReviewerNote": (
            "Verified 22nm tapeout timing closure & open Chisel RTL suite. "
            "Priority technical match for Nokia Bell Labs Espoo & IQM room-temp control."
        ),
        "linkedInSummaryClaim": (
            "Silicon architect working on custom accelerators, vector pipelines, "
            "and low-power edge systems."
        ),
        "scenarioPrompt": (
            "Describe a hard real-time tail-latency failure under shared L2/LLC "
            "contention on edge silicon and how you resolved it within a 5W envelope."
        ),
        "scenarioAnswer": (
            "During 22nm FDSOI multi-core sensor fusion bursts, DMA ring writes evicted "
            "real-time control loop lines from the shared L2, spiking p99.9 ISR latency "
            "to 240ns. Rather than adding SRAM area, we partitioned way-locking via CSRs "
            "and added compact shadow vector register banks in Chisel RTL for fast context "
            "save/restore, locking worst-case jitter to 18ns at 4.8W."
        ),
        "verifiedArtifacts": [
            {
                "title": "rvv-deterministic-isr-bench",
                "type": "GitHub RTL + Verilator Trace",
                "url": "https://github.com/otaniemi-silicon/rvv-deterministic-isr",
                "verificationNote": "Cycle-accurate Verilator waveform & FPGA bitstream timing report verified.",
                "authenticityScore": 97,
            },
            {
                "title": "22nm FDSOI Post-Layout Power Report (Summary)",
                "type": "Silicon Sign-Off Digest",
                "url": "https://zenodo.org/records/1094821",
                "verificationNote": "Cross-checked clock-gating dynamic power drop across TT/FF corners.",
                "authenticityScore": 94,
            },
        ],
        "nemotronReasoning": (
            "1. Evidence Classification: Open Chisel RTL + 22nm tapeout timing verification.\n"
            "2. Propositional Triad: [Problem: 240ns cache jitter under DMA burst] -> "
            "[Mechanism: RISC-V RVV 1.0 shadow register banks & L2 way-locking] -> "
            "[Outcome: 18ns deterministic latency within 4.8W thermal ceiling].\n"
            "3. Room Coverage: Direct bottleneck match for Nokia Bell Labs Espoo & IQM low-latency control."
        ),
        "strengths": [
            "RISC-V RVV 1.0 RTL",
            "22nm FDSOI Timing Closure",
            "Deterministic ISR Latency",
            "Chisel / Verilator Verification",
        ],
        "risksOrFlags": [],
        "currentExploration": "Deterministic 6G baseband + cryogenic FPGA readout co-design in Otaniemi.",
        "radarCoords": {"x": 36, "y": 76},
        "sparks": {
            "Nokia Bell Labs Espoo": "Co-design deterministic sub-millisecond 6G URLLC baseband scheduling in 5W.",
            "IQM Quantum Computers": "Eliminate FPGA/ASIC feedback jitter for real-time syndrome decoding.",
            "VTT Technical Research Centre": "Collaborate on sovereign European RISC-V chiplet packaging.",
        },
    }


def extract_tariq_from_metaverse() -> dict[str, Any]:
    """Read TARIQ_PROFILE from EspooMetaverse.tsx if possible, preserving authentic fields."""
    fallback = build_fallback_tariq()
    if not METAVERSE_PATH.exists():
        return fallback
    text = METAVERSE_PATH.read_text(encoding="utf-8")
    match = re.search(
        r"export const TARIQ_PROFILE:\s*Applicant\s*=\s*(\{.*?\n\});",
        text,
        re.DOTALL,
    )
    if not match:
        return fallback
    block = match.group(1)

    def grab_str(field: str, default: str) -> str:
        m = re.search(rf"{field}:\s*(['\"`])((?:\\.|(?!\1).)*)\1", block, re.DOTALL)
        return m.group(2).replace("\\n", "\n").replace("\\'", "'") if m else default

    def grab_int(field: str, default: int) -> int:
        m = re.search(rf"{field}:\s*(\d+)", block)
        return int(m.group(1)) if m else default

    tariq = dict(fallback)
    for str_field in [
        "id",
        "name",
        "role",
        "origin",
        "avatarInitials",
        "persona",
        "cluster",
        "evidenceCategory",
        "alignmentType",
        "demonstratedMechanism",
        "status",
        "reviewedBy",
        "reviewedAt",
        "humanReviewerNote",
        "linkedInSummaryClaim",
        "scenarioPrompt",
        "scenarioAnswer",
        "currentExploration",
    ]:
        val = grab_str(str_field, "")
        if val:
            tariq[str_field] = val

    for int_field in ["competenceScore", "legacyLinkedInScore", "fluffIndex"]:
        tariq[int_field] = grab_int(int_field, tariq[int_field])

    reasoning = grab_str("nemotronReasoning", "")
    if reasoning:
        if "[Problem:" in reasoning:
            tariq["nemotronReasoning"] = reasoning
        else:
            tariq["nemotronReasoning"] = (
                f"{reasoning}\n"
                "Propositional Triad: [Problem: 240ns cache jitter under DMA burst] -> "
                "[Mechanism: RISC-V RVV 1.0 shadow register banks & L2 way-locking] -> "
                "[Outcome: 18ns deterministic latency within 4.8W thermal ceiling]."
            )

    rc_match = re.search(r"radarCoords:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}", block)
    if rc_match:
        tariq["radarCoords"] = {
            "x": int(rc_match.group(1)),
            "y": int(rc_match.group(2)),
        }

    return tariq


# Authentic diverse name pools (disjoint from hero names)
FINNISH_NAMES = [
    ("Mikko", "Korhonen"), ("Sanna", "Virtanen"), ("Tuomas", "Mäkelä"),
    ("Katja", "Nieminen"), ("Jarkko", "Laine"), ("Laura", "Koskinen"),
    ("Antti", "Heikkinen"), ("Emilia", "Järvinen"), ("Olli", "Lehtonen"),
    ("Riikka", "Saarinen"), ("Kalle", "Salminen"), ("Tiina", "Heinonen"),
    ("Ville", "Niemi"), ("Johanna", "Laitinen"), ("Pasi", "Tuominen"),
    ("Hanna", "Rantanen"), ("Lauri", "Karjalainen"), ("Anniina", "Jokinen"),
    ("Eero", "Mattila"), ("Marika", "Savolainen"), ("Janne", "Ahonen"),
    ("Suvi", "Leppänen"), ("Matti", "Kallio"), ("Nelli", "Hakala"),
    ("Ilkka", "Laaksonen"), ("Veera", "Koivisto"), ("Timo", "Peltonen"),
    ("Kaisa", "Salo"), ("Harri", "Aaltonen"), ("Petra", "Nurmi"),
    ("Juha", "Räsänen"), ("Iida", "Kinnunen"), ("Risto", "Väisänen"),
    ("Pinja", "Manninen"), ("Henri", "Pulkkinen"), ("Aino-Kaisa", "Ojanen"),
    ("Topi", "Vainio"), ("Sini", "Turunen"), ("Arto", "Hiltunen"),
    ("Linnea", "Nyström"),
]

INTERNATIONAL_NAMES = [
    ("Arjun", "Subramanian", "India"),
    ("Nadia", "Kovalenko", "Ukraine"),
    ("Wei-Chen", "Hsu", "Taiwan"),
    ("Darius", "Rahimi", "Iran"),
    ("Claire", "Beaumont", "France"),
    ("Lukas", "Becker", "Germany"),
    ("Kavya", "Deshmukh", "India"),
    ("Zhen", "Liang", "China"),
    ("Oksana", "Melnyk", "Ukraine"),
    ("Parisa", "Tehrani", "Iran"),
    ("Matteo", "Conti", "Italy"),
    ("Sora", "Watanabe", "Japan"),
    ("Tomasz", "Kowalski", "Poland"),
    ("Mei-Ling", "Zhou", "China"),
    ("Rohan", "Kulkarni", "India"),
    ("Farhad", "Shirani", "Iran"),
    ("Hélène", "Moreau", "France"),
    ("Jonas", "Hoffmann", "Germany"),
    ("Ananya", "Iyer", "India"),
    ("Dmytro", "Shevchenko", "Ukraine"),
    ("Yuto", "Nakamura", "Japan"),
    ("Beatriz", "Almeida", "Brazil"),
    ("Seung-Ho", "Park", "South Korea"),
    ("Chiara", "Ricci", "Italy"),
    ("Vikram", "Bhatia", "India"),
    ("Behzad", "Mohammadi", "Iran"),
    ("Antoine", "Lefèvre", "France"),
    ("Katrin", "Weber", "Germany"),
    ("Taras", "Bondarenko", "Ukraine"),
    ("Jingyi", "Wu", "China"),
    ("Siddharth", "Menon", "India"),
    ("Mina", "Kazemi", "Iran"),
    ("Katarzyna", "Nowak", "Poland"),
    ("Rafael", "Mendoza", "Spain"),
    ("Ji-Eun", "Kim", "South Korea"),
    ("Giulia", "Ferrari", "Italy"),
    ("Pranav", "Joshi", "India"),
    ("Bohdan", "Kravchuk", "Ukraine"),
    ("Maxime", "Laurent", "France"),
    ("Stefan", "Krämer", "Germany"),
    ("Xin", "Tang", "China"),
    ("Leila", "Farhadi", "Iran"),
    ("Diogo", "Ferreira", "Portugal"),
    ("Haruka", "Sato", "Japan"),
]

JUNIOR_NAMES = [
    ("Onni", "Kumpulainen", "Otaniemi, Espoo · Aalto MSc Candidate"),
    ("Siiri", "Tammela", "Helsinki · Aalto CS & Embedded BSc"),
    ("Aapo", "Keskitalo", "Tapiola, Espoo · Career Switcher (FITech)"),
    ("Yuki", "Tanaka", "Otaniemi, Espoo · Aalto Exchange MSc (Japan)"),
    ("Riku", "Lahti", "Leppävaara, Espoo · Metropolia EV Engineering"),
    ("Daria", "Sokolova", "Otaniemi, Espoo · Aalto Quantum MSc"),
    ("Noora", "Vartiainen", "Tampere / Espoo · Bioengineering MSc"),
    ("Kieran", "O'Sullivan", "Otaniemi, Espoo · Aalto Cloud MSc (Ireland)"),
    ("Venla", "Suominen", "Helsinki · Applied Physics Undergrad"),
    ("Bastian", "Vogel", "Otaniemi, Espoo · EIT Digital MSc (Germany)"),
]

SPAMMER_NAMES = [
    ("Braxton", "Vance-Keller", "Helsinki · Stealth Web3 AI Syndicate"),
    ("Tiffany", "Sterling-Fox", "Dubai / Helsinki · Growth & Fractional CXO"),
    ("Skyler", "McAllister", "Remote · Crypto-Quantum Evangelist"),
    ("Devon", "Thornton", "Espoo · Prompt Engineering Guru LLC"),
    ("Madison", "Voss", "London / Helsinki · Metaverse Talent DAO"),
    ("Chase", "Pendleton", "Remote · 10x Autonomous Revenue AI"),
    ("Bianca", "DeLuca", "Milan / Remote · Fractional AI Board Advisor"),
    ("Tanner", "Hargrove", "Helsinki · Stealth AGI Venture Studio"),
]

# Deep technical specs per cluster so every applicant feels domain-authentic
CLUSTER_SPECS: dict[str, dict[str, Any]] = {
    "Edge AI & Robotics": {
        "roles": [
            "Embedded Rust & Autonomous Robotics Engineer",
            "Edge Computer Vision & TensorRT Architect",
            "Real-Time Sensor Fusion & LiDAR Lead",
            "6G Baseband & URLLC DSP Engineer",
            "Drone & Field Robotics Control Engineer",
        ],
        "scenarios": [
            (
                "Deterministic 15W Jetson Orin INT8 TensorRT Perception",
                "Jetson Orin Nano thermal throttling caused camera-to-control latency spikes of 94ms during multi-object LiDAR+RGB fusion.",
                "Replaced PyTorch runtime with custom CUDA C++ warp-level BEV projection + INT8 PTQ calibration and pinned DMA ring buffers",
                "Locked 42 FPS end-to-end perception at 14.2W sustained with p99 frame jitter under 4.1ms",
                ["Embedded Rust (no_std)", "TensorRT INT8", "CUDA / DMA Ring Buffers", "Jetson Thermal Profiling"],
            ),
            (
                "Zero-Copy micro-ROS DDS Over Deterministic Ethernet",
                "Multi-sensor actuator loop suffered 38ms tail drops on Linux userspace UDP sockets under high pointcloud traffic.",
                "Migrated transport to static arena allocators in Embedded Rust + PREEMPT_RT kernel CPU isolation and TSN Qbv scheduling",
                "Achieved 1.2ms deterministic 1kHz control loop closure with zero heap allocations after boot",
                ["micro-ROS / Iceoryx", "PREEMPT_RT Linux", "IEEE 802.1Qbv TSN", "Embedded Rust"],
            ),
            (
                "Sub-Zero Outdoor Industrial LiDAR Odometry",
                "Snowfall backscatter and lens condensation caused ICP SLAM drift exceeding 1.8m/100m at Espoo port test site.",
                "Built intensity-kurtosis voxel filter + tightly-coupled IMU pre-integration with dynamic covariance gating in C++20",
                "Reduced snowy-weather localization drift to 0.09m/100m on dual-core ARM Cortex-A78AE",
                ["C++20 SLAM", "Ouster LiDAR DSP", "Tightly-Coupled VIO", "Arctic Field Validation"],
            ),
            (
                "Quantized 6G Edge Beamforming Accelerator",
                "Millimeter-wave hybrid beamforming exceeded 350us slot budget on edge DU hardware during rapid UE mobility.",
                "Implemented mixed-precision Q4.11 fixed-point SVD approximation in HLS + Neon SIMD intrinsic kernels",
                "Cut channel estimation cycle count by 4.3x to 78us with <0.3dB BLER degradation",
                ["ARM Neon SIMD", "6G URLLC PHY", "Fixed-Point HLS", "Baseband DSP"],
            ),
        ],
        "companies": ["Nokia Bell Labs Espoo", "ICEYE", "VTT Technical Research Centre"],
        "prompt": "Detail a strict compute, memory bandwidth, or thermal constraint on edge hardware and the exact low-level change that resolved it.",
        "junior_specs": (
            "Autonomous Mobile Robot Path Tracker",
            "ROS 2 Humble planner oscillated near narrow Otaniemi corridor doorways at 20Hz on Raspberry Pi 5.",
            "Switched local costmap inflation to separable 1D distance transform in C++ and tuned DWB critic weights",
            "Stabilized 20Hz collision-free corridor navigation under 62% single-core CPU load",
            ["ROS 2 C++", "Embedded Linux", "SLAM Toolbox"],
        ),
    },
    "Quantum & Semiconductors": {
        "roles": [
            "Cryo-CMOS & RFSoC FPGA Readout Architect",
            "Superconducting Qubit Control Systems Engineer",
            "Chisel RTL & Mixed-Signal ASIC Designer",
            "Dilution Refrigerator RF Wiring & Thermal Physicist",
            "Silicon Photonics & Quantum Packaging Researcher",
        ],
        "scenarios": [
            (
                "RFSoC Frequency-Multiplexed Qubit State Discrimination",
                "Host PCIe round-trip for 8-qubit readout exceeded 1.4us decoherence window for mid-circuit active reset.",
                "Designed pipelined polyphase channelizer + linear discriminant matched filter directly in Zynq UltraScale+ RFSoC PL",
                "Delivered 185ns total RF-in to trigger-out conditional reset latency with 99.2% assignment fidelity",
                ["Zynq RFSoC FPGA", "Qubit Readout DSP", "SystemVerilog / Chisel", "Low-Latency Feedback"],
            ),
            (
                "20mK Mixing Chamber Heat Load & Attenuation Budget",
                "Adding 24 coaxial drive lines exceeded the 12uW cooling power budget at the 20mK stage, heating qubits above 45mK.",
                "Engineered NbTi superconducting flex-stripline harnesses with distributed thermalized attenuators and IR Eccosorb Eccoshield filters",
                "Held mixing chamber base temperature at 11.4mK while preserving -110dBc phase noise floor",
                ["Cryogenic RF Design", "20mK Thermal Budgeting", "NbTi Flex Lines", "S-Parameter Modeling"],
            ),
            (
                "4K Cryo-CMOS MUX Controller Transconductance Matching",
                "Cryogenic threshold voltage shift (+140mV) broke standard PDK biasing on 22nm FDSOI DAC array.",
                "Characterized cryogenic BSIM models at 4.2K in liquid helium probe station and added programmable sub-threshold body-bias loops",
                "Maintained 10-bit INL < 0.7 LSB across 300K-to-4K cooldown cycles under 0.9mW/channel",
                ["4K Cryo-CMOS", "22nm FDSOI Analog", "Cryogenic Probe Station", "SPICE Corner Modeling"],
            ),
            (
                "Hardware-Accelerated MWPM Quantum Error Decoder",
                "Surface code syndrome bursts at 1MHz cycle rate saturated embedded CPU decoding queue within 400us.",
                "Built pipelined union-find cluster growth engine in Chisel RTL with dual-port BRAM defect graph",
                "Sustained 1.1MHz syndrome throughput with zero backlog on Virtex UltraScale+ at 680ns median decode",
                ["QEC Decoding", "Chisel RTL", "Union-Find ASIC/FPGA", "Timing Closure"],
            ),
        ],
        "companies": ["IQM Quantum Computers", "VTT Technical Research Centre", "Nokia Bell Labs Espoo"],
        "prompt": "Describe a cryogenic, RF, or timing bottleneck in quantum control or custom silicon and how you quantified the fix.",
        "junior_specs": (
            "Coplanar Waveguide Resonator Cryo Simulation",
            "Parasitic slotline modes degraded simulated Q-factor of an 8-resonator niobium chip in HFSS.",
            "Added swept airbridge grounding geometries along bend discontinuities and verified cross-talk S21 isolation",
            "Lifted predicted internal quality factor above 1.2M while keeping nearest-neighbor crosstalk below -42dB",
            ["Ansys HFSS", "Qiskit Metal", "RF Simulation"],
        ),
    },
    "CleanTech & Smart Grid": {
        "roles": [
            "EV Heavy-Duty BMS & CAN-FD Firmware Lead",
            "Bidirectional V2G & ISO 15118-20 Architect",
            "SiC Power Electronics & Grid Inverter Engineer",
            "Fingrid FCR-D Fast Frequency Reserve Specialist",
            "Industrial Electrolyzer & Microgrid Control Lead",
        ],
        "scenarios": [
            (
                "Arctic -30°C Heavy EV CAN-FD BMS State Estimation",
                "Cold-soaked LFP cells exhibited flat OCV plateaus causing 14% State-of-Charge drift on electric mining haulers.",
                "Implemented dual extended Kalman filter fused with online electrochemical impedance pulse probing over CAN-FD",
                "Bounded SoC estimation error within +/-1.8% across -30°C to +45°C duty cycles",
                ["Embedded C / BMS", "CAN-FD / J1939", "Kalman SoC/SoH", "Arctic EV Testing"],
            ),
            (
                "ISO 15118-20 Bidirectional V2GTLS Handshake & Grid Sync",
                "TLS 1.3 mutual cert verification plus EXI schema parsing tripped 2.0s charger-vehicle session timeout on Cortex-M7.",
                "Pre-computed ECDSA P-256 hardware-accelerated crypto contexts via HSM and streamed zero-malloc EXI parser",
                "Cut Plug&Charge V2G handshake latency to 410ms and passed EU grid-code fault ride-through tests",
                ["ISO 15118-20 V2G", "EXI / TLS 1.3", "STM32 / HSM", "EVSE Firmware"],
            ),
            (
                "1200V SiC Inverter Dead-Time & Switching Loss Mitigation",
                "Harmonic ringing at 65kHz PWM caused gate-driver shoot-through faults at 800VDC bus under cold start.",
                "Redesigned Kelvin-source gate loop + active Miller clamp and adaptive dead-time LUT driven by junction temp telemetry",
                "Raised peak inverter efficiency to 99.1% at 250kW with 38% lower dv/dt EMI emissions",
                ["1200V SiC MOSFETs", "Power Electronics", "Gate Driver PCB", "Thermal / EMI"],
            ),
            (
                "Sub-Second BESS Frequency Containment (FCR-D)",
                "SCADA cloud polling added 680ms delay, risking Fingrid FCR-D compliance penalties during 49.5Hz grid dips.",
                "Moved droop frequency calculation into local FPGA PMU phasor frontend with IEC 61850 GOOSE multicast",
                "Activated full 40MW BESS ramp within 190ms of grid frequency trigger",
                ["Fingrid FCR-D", "IEC 61850 GOOSE", "BESS Grid Control", "PMU DSP"],
            ),
        ],
        "companies": ["Kempower", "VTT Technical Research Centre", "Nokia Bell Labs Espoo"],
        "prompt": "Explain a real-world power electronics, BMS, or grid-compliance failure mode you resolved under strict environmental or timing bounds.",
        "junior_specs": (
            "BESS Microgrid Arbitrage & Degradation Optimizer",
            "Naive Nord Pool spot-price MILP optimizer cycled virtual battery 3.4x/day, ruining LFP warranty life.",
            "Added convex cycle-depth rainflow penalty term into CVXPY rolling horizon MPC scheduler",
            "Preserved 91% of spot-arbitrage revenue while halving projected annual capacity fade",
            ["Python CVXPY", "Nord Pool Market Modeling", "Battery Degradation MPC"],
        ),
    },
    "Bio & HealthTech": {
        "roles": [
            "Microfluidic Biosensor & Impedance DSP Lead",
            "Medical Embedded Signal & ECG Firmware Engineer",
            "Federated Clinical Imaging & GDPR ML Architect",
            "Point-of-Care Optical Assay & Firmware Designer",
            "Wearable Photoplethysmography (PPG) Algorithm Engineer",
        ],
        "scenarios": [
            (
                "Sub-Micron PDMS Microfluidic Cytometry Peak Recovery",
                "Coincident cell doublets distorted single-cell impedance spikes at 12,000 events/sec in microfluidic channels.",
                "Built FPGA lock-in demodulator + multi-frequency phase-slope deconvolution pipeline separating doublet centroids",
                "Improved single-cell sorting purity from 83% to 97.4% at 15k events/s under 2.2W portable power",
                ["Microfluidics", "FPGA Lock-In DSP", "Impedance Cytometry", "ISO 13485"],
            ),
            (
                "Motion-Resilient 500Hz Wearable ECG Arrhythmia Engine",
                "Electrode motion artifacts triggered 18 false AFib alarms/hour during ambulatory patient trials.",
                "Coupled dual-axis accelerometer adaptive LMS noise canceller with quantized TinyML 1D-CNN on nRF5340",
                "Dropped false positive rate to 0.4/hour while maintaining 98.6% sensitivity on 11-day coin-cell runtime",
                ["Embedded ECG DSP", "nRF5340 TinyML", "Adaptive LMS", "IEC 62304"],
            ),
            (
                "Findata-Compliant Federated Nordic MRI Segmentation",
                "Cross-hospital domain shift across Siemens/GE 3T scanners degraded tumor Dice score by 19% when weights merged naively.",
                "Engineered FedBN + differential privacy gradient clipping over TLS mutual auth without raw DICOM egress",
                "Lifted held-out cross-site Dice to 0.91 across 4 university hospitals under strict Findata audit",
                ["Federated Learning", "MONAI / PyTorch", "Differential Privacy", "GDPR / Findata"],
            ),
            (
                "Low-Power Optical Lateral Flow Fluorescence Reader",
                "Ambient LED drift shifted calibration curves by 11% across 18C-34C clinic environments.",
                "Added dual-wavelength ratiometric photodiode reference channel + synchronous chopper demodulation in STM32L4",
                "Compressed coefficient of variation to 2.1% LoD sensitivity across clinical field temperatures",
                ["Optical Bio-Assay", "STM32 Analog Frontend", "Chopper Demodulation", "MedTech QA"],
            ),
        ],
        "companies": ["VTT Technical Research Centre", "ICEYE", "Nokia Bell Labs Espoo"],
        "prompt": "Describe how you preserved signal fidelity, clinical accuracy, or strict medical data governance under noisy real-world constraints.",
        "junior_specs": (
            "EMG Gesture Noise Filtering on Nordic SoC",
            "50Hz mains hum swamped dry-electrode forearm sEMG signals during prototype exoskeleton testing.",
            "Implemented fixed-point biquad IIR notch + envelope RMS feature extractor in Zephyr RTOS C",
            "Achieved 93% classification accuracy across 5 grip classes at 6ms inference latency",
            ["Zephyr RTOS", "Bio-Signal DSP", "Embedded C"],
        ),
    },
    "Sovereign AI & Cloud Infra": {
        "roles": [
            "Kernel Storage & io_uring Systems Architect",
            "HPC Multi-Node GPU & LUMI ROCm Engineer",
            "Confidential Computing & TEE Enclave Engineer",
            "eBPF XDP Sovereign Network & Telemetry Lead",
            "Distributed vLLM & Sovereign Inference Architect",
        ],
        "scenarios": [
            (
                "Zero-Copy io_uring NVMe Checkpoint Engine",
                "Multi-terabyte LLM checkpoints stalled 64xMI250X training clusters for 14 minutes per save due to POSIX page-cache lock contention.",
                "Replaced buffered I/O with registered fixed-buffer io_uring SQPOLL queues + O_DIRECT striped NVMe-oF writers",
                "Sustained 46 GB/s aggregate checkpoint write throughput, cutting cluster stall by 81%",
                ["Linux io_uring", "NVMe-oF / Rust", "POSIX Kernel Bypass", "HPC Storage"],
            ),
            (
                "ROCm RCCL Collective Ring Optimization on LUMI-G",
                "AllReduce latency spiked 3.8x above 256 GPUs due to Slingshot NIC congestion and poorly aligned tensor buckets.",
                "Tuned hierarchical intra-node xGMI vs inter-node Slingshot ring topologies and overlapped FP8 gradient bucketing",
                "Recovered 91% weak-scaling efficiency up to 512 GPUs on sovereign European foundation runs",
                ["ROCm / RCCL", "Cray Slingshot", "LUMI Supercomputer", "Distributed Training"],
            ),
            (
                "AMD SEV-SNP Attested Confidential Inference Gateway",
                "Regulated municipal health payloads needed cryptographic proof that weights & prompts remained unobservable to cloud hypervisors.",
                "Built Rust attestation verifier using SEV-SNP guest vTPM quotes wired into mTLS Enclave proxy before key unsealing",
                "Measured <3.4ms attestation-cached overhead with zero plaintext memory exposure to host OS",
                ["AMD SEV-SNP", "Confidential Computing", "Rust mTLS", "EU AI Act Sovereignty"],
            ),
            (
                "eBPF XDP Sovereign Audit & Wire-Speed Filtering",
                "Iptables + Envoy sidecars added 9.2ms tail latency and 22% CPU tax at 40Gbps telemetry ingress.",
                "Moved L3/L4 policy enforcement and ringbuf EU audit metadata emission into verified eBPF XDP kernel programs",
                "Processed 38Mpps wire-speed packet inspection at <4% CPU overhead on dual-socket EPYC",
                ["eBPF / XDP", "Linux Networking", "Rust Aya", "Zero-Trust Telemetry"],
            ),
        ],
        "companies": ["Nokia Bell Labs Espoo", "ICEYE", "VTT Technical Research Centre"],
        "prompt": "Describe a kernel, distributed systems, or sovereign security bottleneck and the systems-level engineering used to remove it.",
        "junior_specs": (
            "Deterministic Container Startup & Seccomp Profiler",
            "Cold-starting Python inference workers took 7.8s, breaking synchronous municipal queue SLAs.",
            "Pre-baked read-only squashfs layers + custom seccomp-bpf allowlist profile and lazy page-fault prefetch",
            "Reduced cold start to 640ms while shrinking syscall surface area by 64%",
            ["Linux Containers", "seccomp-bpf", "Systems Performance"],
        ),
    },
}

NDA_ORGS = [
    "Tier-1 Nordic Telecom R&D",
    "European Aerospace SAR Consortium",
    "Nordic Cryogenics Supplier",
    "FinTech / Critical Grid Operator",
    "EU Medical Device OEM",
    "European Defense & Dual-Use Lab",
]


def make_unique_applicant(
    idx: int,
    cluster: str,
    evidence: str,
    name_tuple: tuple[str, ...],
    rng: random.Random,
    origin_kind: str,
) -> dict[str, Any]:
    app_id = f"app-{idx:02d}" if idx < 100 else f"app-{idx}"
    first, last = name_tuple[0], name_tuple[1]
    full_name = f"{first} {last}"
    initials = (first[0] + last[0]).upper()
    spec = CLUSTER_SPECS[cluster]
    cx, cy = CLUSTER_RADAR_CENTERS[cluster]

    # Origin text aligned with 45% International / 40% Finnish / 15% Junior targets
    if origin_kind == "international":
        country = name_tuple[2]
        hubs = [
            f"Otaniemi, Espoo · Aalto MSc Alumni ({country})",
            f"Keilaniemi, Espoo · Relocated Researcher ({country})",
            f"Leppävaara, Espoo · Senior R&D ({country})",
            f"Tapiola, Espoo · Ex-CERN / TU Alumni ({country})",
        ]
        origin = rng.choice(hubs)
    elif origin_kind == "finnish":
        hubs = [
            "Otaniemi, Espoo · Ex-VTT / Aalto R&D",
            "Tapiola, Espoo · Espoo Tech Guild",
            "Hervanta, Tampere · DeepTech Systems",
            "Linnanmaa, Oulu · Embedded & Radio R&D",
            "Ruoholahti, Helsinki · Critical Infra",
            "Matinkylä, Espoo · Industrial R&D",
        ]
        origin = rng.choice(hubs)
    else:
        origin = name_tuple[2] if len(name_tuple) > 2 else "Otaniemi, Espoo · Aalto FITech"

    if evidence == "Self-Reported Claims Only":
        # Dead Zone spammer profile
        buzz_roles = [
            "Fractional AI Growth & Synergy Visionary",
            "10x Autonomous Agent Thought Leader",
            "Web3 Quantum Prompt Strategist",
            "Chief Metaverse & GenAI Evangelist",
        ]
        buzz_phrases = [
            "Leveraging exponential multi-agent hyper-growth paradigms and tokenized vector synergies for 100x enterprise transformation.",
            "Building a proprietary stealth AGI wrapper that disrupts legacy hardware silos via decentralized blockchain orchestration.",
            "Architecting visionary GPT-wrapper ecosystems with frictionless neural paradigms and exponential founder velocity.",
            "Unlocking quantum-enabled brand resonance through autonomous prompt engineering and Web3 AI flywheel monetisation.",
        ]
        fluff = rng.randint(78, 95)
        comp = rng.randint(13, 28)
        legacy = rng.randint(84, 96)
        claim = rng.choice(buzz_phrases)
        return {
            "id": app_id,
            "name": full_name,
            "role": rng.choice(buzz_roles),
            "origin": origin,
            "avatarInitials": initials,
            "persona": "Startup Founder",
            "cluster": cluster,
            "competenceScore": comp,
            "legacyLinkedInScore": legacy,
            "fluffIndex": fluff,
            "evidenceCategory": evidence,
            "alignmentType": "Exploration & High Learning Agility",
            "demonstratedMechanism": (
                "No reproducible technical mechanism submitted; answer relies solely "
                "on ungrounded hype buzzwords."
            ),
            "status": "flagged",
            "reviewedBy": "Automated Fluff Filter · Pending Human Override",
            "reviewedAt": "2026-11-14 08:15",
            "humanReviewerNote": (
                "Routed to Dead Zone: zero concrete latency, hardware, or protocol metrics "
                "to substantiate LinkedIn executive claims."
            ),
            "linkedInSummaryClaim": claim,
            "scenarioPrompt": spec["prompt"],
            "scenarioAnswer": (
                f"When scaling {cluster}, my superpower is orchestrating 10x AI synergies "
                "and autonomous neural flywheels. Once we deploy our proprietary stealth SaaS "
                "platform, latency simply melts away cleanly!"
            ),
            "verifiedArtifacts": [],
            "nemotronReasoning": (
                f"1. Evidence Classification: High Fluff Index ({fluff}/100), Self-Reported Claims Only.\n"
                "2. Propositional Triad: [Problem: Unverified abstract claim] -> "
                "[Mechanism: Generic LLM buzzword boilerplate without physical parameters] -> "
                "[Outcome: Flagged & quarantined in Outer Dead Zone].\n"
                "3. Room Coverage: Do not allocate constrained Otaniemi partner slots."
            ),
            "strengths": ["Executive Pitch Polish"],
            "risksOrFlags": [
                f"Extreme Fluff Index ({fluff}/100)",
                "Zero reproducible code, math, or constraint trade-offs",
            ],
            "currentExploration": "Seeking keynote exposure and seed-stage investor introductions.",
            "radarCoords": {"x": rng.randint(80, 95), "y": rng.randint(12, 31)},
            "sparks": {},
        }

    # Select scenario details
    if evidence == "Applied Reasoning (Junior / Student)":
        title, prob, mech, outc, skills = spec["junior_specs"]
        comp = rng.randint(68, 84)
        legacy = rng.randint(24, 48)
        fluff = rng.randint(6, 17)
        role = rng.choice([
            "Aalto MSc Research Assistant",
            "Junior Systems & Firmware Developer",
            "Career-Switcher Embedded Engineer (FITech)",
            "Graduate Lab Intern · Otaniemi",
        ])
        persona = "Researcher" if "MSc" in role or "Lab" in role else "Builder / Engineer"
        alignment = "Exploration & High Learning Agility"
        status = rng.choice(["approved", "pending", "pending", "waitlisted"])
        artifacts = [
            {
                "title": f"{first.lower()}-{title.lower().replace(' ', '-')[:22]}",
                "type": "GitHub Course/Lab Repo",
                "url": f"https://github.com/aalto-builders/{first.lower()}-{idx}",
                "verificationNote": "Clean commit history, reproducible README benchmark & unit checks verified.",
                "authenticityScore": rng.randint(78, 88),
            }
        ]
    else:
        title, prob, mech, outc, skills = spec["scenarios"][idx % len(spec["scenarios"])]
        role = spec["roles"][idx % len(spec["roles"])]
        comp = rng.randint(80, 96) if evidence != "Peer-Reviewed Research / Poster" else rng.randint(82, 95)
        fluff = rng.randint(5, 19)
        legacy = rng.randint(52, 88)
        if evidence == "Peer-Reviewed Research / Poster":
            persona = "Researcher"
        elif idx % 7 == 0:
            persona = "Domain Specialist"
        else:
            persona = "Builder / Engineer"
        alignment = (
            "Direct Bottleneck Match"
            if comp >= 86
            else "Complementary Domain Capability"
        )
        if comp >= 87:
            status = rng.choice(["approved", "approved", "approved", "pending"])
        else:
            status = rng.choice(["approved", "pending", "waitlisted"])

        if evidence == "Verified Public Code / Benchmark":
            slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:26]
            artifacts = [
                {
                    "title": f"{slug}-bench",
                    "type": "GitHub Repository + CI Trace",
                    "url": f"https://github.com/espoo-oss/{first.lower()}-{slug}",
                    "verificationNote": "Reproducible CI benchmark suite, hardware counters & commit log verified.",
                    "authenticityScore": rng.randint(88, 97),
                }
            ]
        elif evidence == "Redacted Enterprise NDA Vignette":
            nda_org = NDA_ORGS[idx % len(NDA_ORGS)]
            artifacts = [
                {
                    "title": f"Redacted Production Vignette ({nda_org})",
                    "type": "Sanitized Technical Post-Mortem",
                    "url": f"internal://nda-vault/{app_id}",
                    "verificationNote": f"Mechanistic trade-off internally consistent; commercial IP redacted under {nda_org} NDA.",
                    "authenticityScore": rng.randint(84, 94),
                }
            ]
        else:  # Peer-Reviewed Research / Poster
            artifacts = [
                {
                    "title": f"DOI: 10.1109/ESPOO.2025.{1000 + idx} ({title[:34]})",
                    "type": "IEEE / ArXiv Peer-Reviewed Paper",
                    "url": f"https://arxiv.org/abs/25{(idx % 11) + 1:02d}.{4100 + idx}",
                    "verificationNote": "Authorship verified via ORCID & reproducible experimental appendix.",
                    "authenticityScore": rng.randint(87, 96),
                }
            ]

    reviewer = "Marika K. (City of Espoo)" if status == "approved" else None
    reviewed_at = f"2026-11-14 {8 + (idx % 10):02d}:{(idx * 7) % 60:02d}" if status == "approved" else None
    reviewer_note = (
        f"Verified {evidence} triad addressing {cluster} partner bottleneck."
        if status == "approved"
        else ""
    )

    c1, c2 = spec["companies"][0], spec["companies"][1]
    sparks = {
        c1: f"Apply {skills[0]} to resolve {prob[:68].rstrip('.')}.",
        c2: f"Exchange field lessons on {skills[1]} & {outc[:52].rstrip('.')}.",
    }

    return {
        "id": app_id,
        "name": full_name,
        "role": role,
        "origin": origin,
        "avatarInitials": initials,
        "persona": persona,
        "cluster": cluster,
        "competenceScore": comp,
        "legacyLinkedInScore": legacy,
        "fluffIndex": fluff,
        "evidenceCategory": evidence,
        "alignmentType": alignment,
        "demonstratedMechanism": f"{mech} -> {outc}.",
        "status": status,
        "reviewedBy": reviewer,
        "reviewedAt": reviewed_at,
        "humanReviewerNote": reviewer_note,
        "linkedInSummaryClaim": (
            f"{role} focused on {skills[0]}, {skills[1]}, and resilient {cluster} systems."
        ),
        "scenarioPrompt": spec["prompt"],
        "scenarioAnswer": (
            f"Context: {prob} "
            f"Engineering Intervention: {mech}. "
            f"Measured Verification: {outc}."
        ),
        "verifiedArtifacts": artifacts,
        "nemotronReasoning": (
            f"1. Evidence Classification: {evidence} ({fluff}% fluff).\n"
            f"2. Propositional Triad: [Problem: {prob}] -> [Mechanism: {mech}] -> [Outcome: {outc}].\n"
            f"3. Room Coverage: Strong {cluster} fit for {c1} and {c2}."
        ),
        "strengths": skills,
        "risksOrFlags": (
            ["Needs senior mentorship pairing on production sign-off"]
            if evidence == "Applied Reasoning (Junior / Student)"
            else []
        ),
        "currentExploration": f"Hands-on {skills[0]} & {skills[1]} collaborations in Dipoli Otaniemi.",
        "radarCoords": {
            "x": max(12, min(88, cx + rng.randint(-10, 10))),
            "y": max(14, min(88, cy + rng.randint(-10, 10))),
        },
        "sparks": sparks,
    }


def main() -> None:
    if not APPLICANTS_PATH.exists():
        raise FileNotFoundError(f"Missing {APPLICANTS_PATH}")

    existing_raw: list[dict[str, Any]] = json.loads(
        APPLICANTS_PATH.read_text(encoding="utf-8")
    )
    by_id = {item["id"]: item for item in existing_raw}

    # Preserve Tariq (already in existing_raw on re-runs, else parse EspooMetaverse.tsx)
    if "app-tariq" not in by_id:
        by_id["app-tariq"] = extract_tariq_from_metaverse()

    # Build top 10 heroes in exact HERO_ORDER
    top_10: list[dict[str, Any]] = []
    for hid in HERO_ORDER:
        if hid not in by_id:
            raise KeyError(f"Required hero profile {hid} missing from source data")
        hero = dict(by_id[hid])
        # Guarantee Mateo (app-04) has competenceScore >= 94 if needed, and Tariq has triad
        if hid == "app-tariq" and "[Problem:" not in hero.get("nemotronReasoning", ""):
            hero["nemotronReasoning"] = build_fallback_tariq()["nemotronReasoning"]
        top_10.append(hero)

    # Preserve Noora Lindstrom (app-10 originally -> renumbered to app-11)
    noora_src = by_id.get("app-11") or by_id.get("app-10")
    if not noora_src:
        raise KeyError("Original app-10 / app-11 (Noora Lindström) missing")
    noora = dict(noora_src)
    noora["id"] = "app-11"

    base_11 = top_10 + [noora]

    # Calculate remaining cluster & evidence quotas for the 89 applicants (app-12 .. app-100)
    rem_clusters = dict(CLUSTER_TARGETS)
    rem_evidence = dict(EVIDENCE_TARGETS)
    rem_spammers_by_cluster = dict(SPAMMER_TARGETS_BY_CLUSTER)

    for a in base_11:
        rem_clusters[a["cluster"]] -= 1
        rem_evidence[a["evidenceCategory"]] -= 1
        if a["evidenceCategory"] == "Self-Reported Claims Only":
            rem_spammers_by_cluster[a["cluster"]] = max(
                0, rem_spammers_by_cluster[a["cluster"]] - 1
            )

    assert sum(rem_clusters.values()) == 89, f"Cluster diff sum={sum(rem_clusters.values())}"
    assert sum(rem_evidence.values()) == 89, f"Evidence diff sum={sum(rem_evidence.values())}"

    rng = random.Random(20261114)

    # First pair exact spammer slots per cluster
    slot_pairs: list[tuple[str, str]] = []
    for c_name, sp_count in rem_spammers_by_cluster.items():
        for _ in range(sp_count):
            slot_pairs.append((c_name, "Self-Reported Claims Only"))
            rem_clusters[c_name] -= 1
            rem_evidence["Self-Reported Claims Only"] -= 1

    assert rem_evidence["Self-Reported Claims Only"] == 0

    # Pair remaining cluster slots with remaining non-spammer evidence categories
    cluster_bag: list[str] = []
    for c_name, cnt in rem_clusters.items():
        cluster_bag.extend([c_name] * cnt)

    evidence_bag: list[str] = []
    for ev_name, cnt in rem_evidence.items():
        evidence_bag.extend([ev_name] * cnt)

    assert len(cluster_bag) == len(evidence_bag)
    rng.shuffle(cluster_bag)
    rng.shuffle(evidence_bag)
    slot_pairs.extend(zip(cluster_bag, evidence_bag))

    # Separate spammer slots, junior slots, and builder/researcher slots, then interleave cleanly
    rng.shuffle(slot_pairs)

    # Prepare exact demographic name queues (from 89 generated):
    # Base 11 already includes ~4 international (Priya, Tariq, Mateo, Elena, Kenji = 5),
    # 4 Finnish (Lukas, Aino, Sami, Noora = 4), 2 Juniors (Aino, Noora) -> wait:
    # Target across all 100: ~45 international, ~40 Finnish, ~15 junior/career-changer (and 10 spammers).
    # For the 89 slots: exact 9 junior names for the 9 'Applied Reasoning (Junior / Student)' slots,
    # 8 spammer names for the 8 'Self-Reported Claims Only' slots,
    # plus ~40 international and ~32 remaining Finnish+career-changer names across the 72 core slots!
    finnish_iter = iter(FINNISH_NAMES)
    intl_iter = iter(INTERNATIONAL_NAMES)
    junior_iter = iter(JUNIOR_NAMES)
    spam_iter = iter(SPAMMER_NAMES)

    # Build origin pattern for the 72 non-junior, non-spammer slots:
    # 40 international + 32 Finnish = 72 (making total across 100: ~45 intl, ~38-40 Finnish, ~15 junior/career)
    core_kinds = (["international"] * 40) + (["finnish"] * 32)
    rng.shuffle(core_kinds)
    core_kind_iter = iter(core_kinds)

    generated: list[dict[str, Any]] = []
    for offset, (cluster, evidence) in enumerate(slot_pairs):
        idx = 12 + offset
        if evidence == "Self-Reported Claims Only":
            n_tup = next(spam_iter)
            o_kind = "spam"
        elif evidence == "Applied Reasoning (Junior / Student)":
            n_tup = next(junior_iter)
            o_kind = "junior"
        else:
            o_kind = next(core_kind_iter)
            n_tup = next(intl_iter) if o_kind == "international" else next(finnish_iter)

        generated.append(make_unique_applicant(idx, cluster, evidence, n_tup, rng, o_kind))

    full_list = base_11 + generated
    assert len(full_list) == 100, f"Expected 100, got {len(full_list)}"

    # Verify unique IDs and names
    ids = [a["id"] for a in full_list]
    names = [a["name"] for a in full_list]
    assert len(set(ids)) == 100, "Duplicate applicant IDs detected"
    assert len(set(names)) == 100, "Duplicate applicant names detected"

    APPLICANTS_PATH.write_text(
        json.dumps(full_list, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    # Print verification stats
    from collections import Counter
    print(f"Wrote {len(full_list)} applicants to {APPLICANTS_PATH.relative_to(ROOT)}")
    print("Top 11 IDs:", [a["id"] for a in full_list[:11]])
    print("Clusters:", dict(Counter(a["cluster"] for a in full_list)))
    print("Evidence:", dict(Counter(a["evidenceCategory"] for a in full_list)))
    flagged = [a for a in full_list if a["status"] == "flagged"]
    print(f"Flagged/Dead Zone count: {len(flagged)}")


if __name__ == "__main__":
    main()
