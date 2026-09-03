import { jsPDF } from 'jspdf';

// Brand colors
const PRIMARY_COLOR: [number, number, number] = [79, 70, 229]; // Indigo #4F46E5
const TEXT_MAIN: [number, number, number] = [15, 23, 42]; // Slate-900
const TEXT_MUTED: [number, number, number] = [100, 116, 139]; // Slate-500
const ACCENT_GREEN: [number, number, number] = [16, 185, 129]; // Emerald #10B981
const BG_PANEL: [number, number, number] = [248, 250, 252]; // Slate-50

/**
 * Generate Admin & Operations Management Guide PDF
 */
export function generateAdminGuidePDF(companyName: string = 'WorkPulse') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeaderFooter();
    }
  };

  const drawHeaderFooter = () => {
    const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${companyName} • Administrator Operations & Setup Guide`, margin, 8);
    doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - margin - 12, 8);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 10, pageWidth - margin, 10);
  };

  // ---------------- PAGE 1: COVER & OVERVIEW ----------------
  // Header banner
  doc.setFillColor(...PRIMARY_COLOR);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 28, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('WorkPulse Administrator & Manager Guide', margin + 6, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Complete Reference for Setting Up Companies, Job Sites, Worker Access, & Payroll', margin + 6, y + 19);
  doc.text(`Organization: ${companyName} | System Version: 2.4 High-Density`, margin + 6, y + 24);

  y += 34;

  // Section 1: Quick Start Setup Checklist
  doc.setFillColor(...BG_PANEL);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 42, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 42, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('1. Initial Setup Checklist (4 Essential Steps)', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MAIN);
  const checklist = [
    'Step 1: Configure Organization (Settings tab: Set Company Name, Daily/Weekly Overtime rules, & Geofence defaults).',
    'Step 2: Create Job Locations (Jobs tab: Enter Client Name, Street Address, GPS Geofence Radius, & Site Hazards).',
    'Step 3: Add & Assign Workers (Team tab: Add employee email, hourly rate, and check assigned authorized job sites).',
    'Step 4: Distribute Access Notices (Click "Notice & Login Info" on any worker card to send credentials & PIN).',
  ];

  checklist.forEach((item, idx) => {
    doc.text(item, margin + 6, y + 14 + idx * 6.5);
  });

  y += 48;

  // Section 2: Managing Job Sites & Geofencing
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_MAIN);
  doc.text('2. Setting Up Job Sites & Geofencing', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MAIN);
  doc.text('Every project or job site in WorkPulse functions as a location anchor for worker time punches:', margin, y);
  y += 5;

  const jobPoints = [
    '• Street Address & Auto-Geocoding: Type the street address. The app automatically fetches GPS latitude/longitude.',
    '• Geofence Radius: Set between 50 meters (dense urban builds) to 500 meters (large industrial sites, highway projects).',
    '• Geofence Enforcement: Workers outside the radius are flagged with "Out of Geofence" warnings for manager review.',
    '• Client & Billing Notes: Add custom client details and safety requirements (e.g. PPE Level 2, Hardhat, Safety Glasses).',
  ];
  jobPoints.forEach((p) => {
    doc.text(p, margin + 4, y);
    y += 5.5;
  });

  y += 3;

  // Section 3: Adding Team Members & Roles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_MAIN);
  doc.text('3. Team & Role Management (RBAC)', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MAIN);

  const roleRows = [
    ['Owner / Admin', 'Full control: Create/edit company, add jobs, set pay rates, approve timesheets, export payroll.'],
    ['Manager', 'Operational control: View Live Roster, monitor GPS/selfie audit trails, review shift hours, edit punches.'],
    ['Employee', 'Field clock only: Select authorized jobs, clock in/out, start/end breaks, view personal daily timesheet.'],
  ];

  roleRows.forEach(([r, desc]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(`• ${r}:`, margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MAIN);
    doc.text(desc, margin + 34, y, { maxWidth: pageWidth - margin * 2 - 36 });
    y += 7;
  });

  // Section 4: Live Roster & GPS Photo Verification
  y += 4;
  checkPageBreak(50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_MAIN);
  doc.text('4. Live Roster & Real-Time Shift Monitoring', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MAIN);
  const livePoints = [
    '• Live Clock-In Feed: Shows all currently clocked-in personnel with real-time timers and active job site names.',
    '• Selfie & GPS Audit Modal: Click any worker card to view high-resolution verification selfie and GPS coordinate pin.',
    '• Break Tracking: Displays whether a worker is on an active rest break or meal break with elapsed break duration.',
  ];
  livePoints.forEach((p) => {
    doc.text(p, margin + 4, y);
    y += 5.5;
  });

  // Section 5: Timesheets, Overtime & Payroll Export
  y += 4;
  checkPageBreak(50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_MAIN);
  doc.text('5. Timesheet Approvals & Payroll Calculations', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MAIN);
  const payrollPoints = [
    '• Daily & Weekly Overtime: Automatically split regular hours and 1.5x overtime hours based on company thresholds.',
    '• Total Estimated Gross Wages: Computed in real time based on each worker’s configured hourly pay rate.',
    '• CSV & Payroll Export: Download standard spreadsheet files compatible with QuickBooks, Gusto, ADP, and Paychex.',
    '• Audit Logs: Every punch retains tamper-proof timestamps, GPS accuracy meters, and camera verification tokens.',
  ];
  payrollPoints.forEach((p) => {
    doc.text(p, margin + 4, y);
    y += 5.5;
  });

  // Draw header/footer for page 1
  drawHeaderFooter();

  // Save/Return
  return doc;
}

/**
 * Generate Employee & Field Worker User Guide PDF
 */
export function generateEmployeeGuidePDF(companyName: string = 'WorkPulse') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const drawHeaderFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${companyName} • Employee Field Time Clock Guide`, margin, 8);
    doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - margin - 12, 8);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 10, pageWidth - margin, 10);
  };

  // Header banner
  doc.setFillColor(...ACCENT_GREEN);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 28, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('WorkPulse Employee Field User Guide', margin + 6, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('How to Clock In, Track Breaks, Work Offline, and Review Your Timesheets', margin + 6, y + 19);
  doc.text(`Company: ${companyName} | Mobile & Tablet Optimized`, margin + 6, y + 24);

  y += 34;

  // Section 1: How to Log In
  doc.setFillColor(...BG_PANEL);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 38, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 38, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...TEXT_MAIN);
  doc.text('1. How to Sign In to Your Time Clock', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MAIN);
  const loginSteps = [
    '1. Open the WorkPulse web link on your mobile browser (Safari or Chrome).',
    '2. Tap "Switch Login Role" or the profile pill at the top-right.',
    '3. Select the "Employee Login" tab.',
    '4. Tap your name in 1-Click Worker Access, or enter your Email and Password/PIN (default: password123).',
  ];
  loginSteps.forEach((s, i) => {
    doc.text(s, margin + 6, y + 14 + i * 5.5);
  });

  y += 44;

  // Section 2: Clocking In to a Job
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...TEXT_MAIN);
  doc.text('2. Clocking In to Your Shift (Step-by-Step)', margin, y);
  y += 6;

  const clockSteps = [
    '• Step 1 - Select Job Site: Tap the dropdown to choose the project location you are working at today.',
    '• Step 2 - Review Job Notes: Check safety hazard alerts, gate access codes, and site supervisor instructions.',
    '• Step 3 - Tap START SHIFT / CLOCK IN: The app verifies your GPS position against the site geofence.',
    '• Step 4 - Take Verification Selfie: Position your face inside the camera frame and tap "Capture & Punch".',
    '• Step 5 - Confirmation: Your live shift timer starts immediately, displaying elapsed hours and minutes.',
  ];
  clockSteps.forEach((s) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(s, margin + 4, y);
    y += 5.5;
  });

  y += 4;

  // Section 3: Breaks and Lunch
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...TEXT_MAIN);
  doc.text('3. Managing Breaks & Lunch Periods', margin, y);
  y += 6;

  const breakSteps = [
    '• Starting a Break: When taking lunch or a rest break, tap "START BREAK" on your active shift card.',
    '• Choose Break Type: Select "Paid Rest Break (15 min)" or "Unpaid Meal / Lunch (30-60 min)".',
    '• Active Break Timer: The screen turns amber, showing how many minutes you have been on break.',
    '• Ending a Break: When returning to work, tap "END BREAK / RESUME WORK" to continue shift tracking.',
  ];
  breakSteps.forEach((s) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(s, margin + 4, y);
    y += 5.5;
  });

  y += 4;

  // Section 4: Clocking Out at End of Day
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...TEXT_MAIN);
  doc.text('4. Clocking Out at the End of Your Shift', margin, y);
  y += 6;

  const clockOutSteps = [
    '• Tap CLOCK OUT: When finishing your workday or leaving the job site, tap the red "CLOCK OUT" button.',
    '• Add Shift Notes (Optional): You can type equipment used, material deliveries received, or mileage.',
    '• Take Exit Photo: Quick selfie verification confirms the shift end time and location.',
    '• Daily Summary: The screen displays your total shift duration, break duration, and calculated daily hours.',
  ];
  clockOutSteps.forEach((s) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(s, margin + 4, y);
    y += 5.5;
  });

  y += 4;

  // Section 5: Offline Mode & My Timesheets
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...TEXT_MAIN);
  doc.text('5. Offline Mode in Remote Areas & Reviewing My Timesheets', margin, y);
  y += 6;

  const offlineSteps = [
    '• Remote Cell Dead Zones: If you have no mobile service, WorkPulse stores your GPS and selfie locally.',
    '• Auto-Sync: As soon as you regain cell service or WiFi, queued punches automatically sync to the server.',
    '• "My Timesheet" Tab: Tap "My Timesheet" at any time to view all your shifts, daily hours, and total wages.',
  ];
  offlineSteps.forEach((s) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(s, margin + 4, y);
    y += 5.5;
  });

  drawHeaderFooter();
  return doc;
}
