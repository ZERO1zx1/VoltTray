import type { Locale } from "./types";

export interface Dictionary {
  brand: string;
  nav: {
    widget: string;
    devices: string;
    alerts: string;
    settings: string;
  };
  scanDevices: string;
  scanning: string;
  taskbar: {
    osLabelWin: string;
    osLabelLinuxWayland: string;
    osLabelLinuxX11: string;
    trayTooltip: string;
    openWidget: string;
  };
  widget: {
    title: string;
    chargingEst: string;
    dischargingEst: string;
    pausedLimit: string;
    fullCharge: string;
    lowBatteryWarning: string;
    criticalBatteryWarning: string;
    turnOffRgbShort: string;
    rgbTurnedOff: string;
    healthLabel: string;
    dpiBtn: string;
    muteBtn: string;
    unmuteBtn: string;
    trickBtn: string;
    ecoOptimizerTitle: string;
    estimatedPrefix: string;
    gaming: string;
    office: string;
    smartOptLabel: string;
    turnOffRgbFull: string;
    sleepTimerTitle: string;
    sleepTimerDesc: string;
    minutesUnit: string;
    disabledUnit: string;
    connectionHealthTitle: string;
    degradationLimitTitle: string;
    degradationLimitDesc: string;
    chargeTo100Once: string;
    overrideActive: string;
    pollingRate: string;
  };
  connections: {
    usb_dongle_2_4ghz: string;
    bluetooth: string;
    wired_usb: string;
    unknown: string;
  };
  devicesView: {
    title: string;
    subtitle: string;
    transportImpact: string;
    driverLabel: string;
    simulateDischarge: string;
    plugInUsb: string;
    unplugUsb: string;
    disconnectBtn: string;
    reconnectBtn: string;
    inspectHealth: string;
    healthModalTitle: string;
    healthModalDesc: string;
    linuxUdevNotice: string;
    fixUdevBtn: string;
  };
  alertsView: {
    title: string;
    subtitle: string;
    fullscreenMode: string;
    fullscreenDesc: string;
    suppressInFullscreen: string;
    dndMode: string;
    inGameOverlay: string;
    triggerLowBattery: string;
    triggerEndOfDay: string;
    triggerLimit80: string;
    lastDecision: string;
    shownStatus: string;
    suppressedStatus: string;
    overlayTitleLow: string;
    muteRgbAction: string;
    ignoreAction: string;
    eodTitle: string;
    eodBody: string;
    plugInNow: string;
    remindMe: string;
    limit80Title: string;
    limit80Body: string;
    unplugAt80: string;
    chargeOnce100: string;
  };
  settingsView: {
    title: string;
    subtitle: string;
    envSection: string;
    osPlatform: string;
    displayServer: string;
    language: string;
    preferencesSection: string;
    launchAtLogin: string;
    notificationsEnabled: string;
    endOfDayPrompt: string;
    lowThreshold: string;
    checkUpdate: string;
    privacySection: string;
    analyticsToggle: string;
    analyticsActiveDesc: string;
    analyticsOffDesc: string;
    resetIdBtn: string;
    installIdLabel: string;
    notAssigned: string;
    auditLogTitle: string;
    auditLogEmpty: string;
    auditLogDisabled: string;
    clearViewBtn: string;
  };
  consentModal: {
    title: string;
    body: string;
    collectedTitle: string;
    collectedList: string;
    neverTitle: string;
    neverList: string;
    acceptBtn: string;
    declineBtn: string;
  };
  onboarding: {
    welcomeTitle: string;
    welcomeDesc: string;
    scanTitle: string;
    scanDesc: string;
    notificationsTitle: string;
    notificationsDesc: string;
    startupTitle: string;
    startupDesc: string;
    nextBtn: string;
    skipBtn: string;
    finishBtn: string;
  };
}

export const DICTIONARIES: Record<Locale, Dictionary> = {
  en: {
    brand: "VoltTray",
    nav: {
      widget: "Tray Widget",
      devices: "Devices & Health",
      alerts: "Alerts & Overlay",
      settings: "Settings & Privacy",
    },
    scanDevices: "Scan Devices",
    scanning: "Scanning...",
    taskbar: {
      osLabelWin: "Windows 11 · Taskbar Tray",
      osLabelLinuxWayland: "Linux · Wayland Top Panel",
      osLabelLinuxX11: "Linux · X11 System Tray",
      trayTooltip: "Click a tray peripheral to focus it in the widget",
      openWidget: "Open Tray Widget",
    },
    widget: {
      title: "Peripheral Battery Monitor",
      chargingEst: "Charging... {mins} min left",
      dischargingEst: "Discharging · {hours} hrs left",
      pausedLimit: "Paused at 80% protection limit",
      fullCharge: "Fully charged (100%)",
      lowBatteryWarning: "Low Battery! Please Plug In",
      criticalBatteryWarning: "Critical Battery! Plug In Now",
      turnOffRgbShort: "Turn off RGB (+{h}h)",
      rgbTurnedOff: "RGB Off (+{h}h saved)",
      healthLabel: "Health",
      dpiBtn: "DPI",
      muteBtn: "Mute",
      unmuteBtn: "Muted",
      trickBtn: "Eco Profile",
      ecoOptimizerTitle: "Predictive Usage & Eco-Optimizer",
      estimatedPrefix: "Estimated",
      gaming: "Gaming",
      office: "Office",
      smartOptLabel: "Smart Optimization Suggestion",
      turnOffRgbFull: "Turn off RGB Lighting (+{h} hrs of use)",
      sleepTimerTitle: "Sleep Mode Timer",
      sleepTimerDesc: "Adjust auto-shutdown idle timeout",
      minutesUnit: "{m} min",
      disabledUnit: "Off",
      connectionHealthTitle: "Connection & Battery Health",
      degradationLimitTitle: "Degradation Limit 80%",
      degradationLimitDesc: "Stop charging at 80% to protect battery longevity",
      chargeTo100Once: "Charge to 100% Once",
      overrideActive: "Top-up to 100% active for this cycle",
      pollingRate: "Polling Rate",
    },
    connections: {
      usb_dongle_2_4ghz: "2.4GHz USB Dongle",
      bluetooth: "Bluetooth",
      wired_usb: "Wired (Charging)",
      unknown: "Unknown",
    },
    devicesView: {
      title: "Connected Peripherals & Battery Health",
      subtitle:
        "Simulate wireless transports, battery drain curves, and 80% degradation protection across Windows & Linux.",
      transportImpact: "Radio Transport",
      driverLabel: "Protocol Driver",
      simulateDischarge: "Drain -10%",
      plugInUsb: "Plug In USB",
      unplugUsb: "Unplug USB",
      disconnectBtn: "Sleep / Disconnect",
      reconnectBtn: "Reconnect",
      inspectHealth: "Inspect Health",
      healthModalTitle: "Battery Health & Longevity",
      healthModalDesc:
        "Estimated cell capacity retention across charge cycles. Keeping the 80% limit enabled reduces chemical wear.",
      linuxUdevNotice:
        "Linux HID++ udev rule check: device write access required for RGB & sleep timer.",
      fixUdevBtn: "Grant udev Access",
    },
    alertsView: {
      title: "Interrupt-Free Contextual Alerts & End-of-Day Routine",
      subtitle:
        "Single decision gate guarantees either alert_shown or alert_suppressed fires—never both.",
      fullscreenMode: "Active Fullscreen Game / Meeting",
      fullscreenDesc:
        "Simulates an active fullscreen app (checked via OS window flags, never process names).",
      suppressInFullscreen: "Suppress Native Toasts in Fullscreen",
      dndMode: "Do Not Disturb (DND)",
      inGameOverlay: "In-Game / Focus Corner Overlay",
      triggerLowBattery: "Trigger Low Battery (15%)",
      triggerEndOfDay: "Trigger PC Lock Routine",
      triggerLimit80: "Trigger 80% Limit Reached",
      lastDecision: "Last Alert Gate Decision",
      shownStatus: "Shown",
      suppressedStatus: "Suppressed",
      overlayTitleLow: "Low Battery {device} ({pct}% Left)",
      muteRgbAction: "Mute RGB (+2hrs)",
      ignoreAction: "Ignore",
      eodTitle: "Locking PC?",
      eodBody:
        "We suggest plugging in your {device} ({pct}% left) so it is ready tomorrow!",
      plugInNow: "Plugged In",
      remindMe: "Remind me",
      limit80Title: "80% Charge Limit Reached ({device})",
      limit80Body: "Charging paused at 80% to protect battery longevity.",
      unplugAt80: "Unplug Now",
      chargeOnce100: "Charge to 100% Once",
    },
    settingsView: {
      title: "Settings, Environment & Privacy Controls",
      subtitle:
        "Strictly opt-in anonymous telemetry powered by PostHog EU rules. Zero PII, serials, or window titles.",
      envSection: "Runtime Environment Simulation",
      osPlatform: "Operating System",
      displayServer: "Display Server / Windowing",
      language: "Interface Language",
      preferencesSection: "Utility Preferences",
      launchAtLogin: "Launch at OS Login",
      notificationsEnabled: "Desktop Notifications",
      endOfDayPrompt: "End-of-Day Routine Prompt",
      lowThreshold: "Low Battery Alert Threshold",
      checkUpdate: "Simulate App Update (v1.0.1)",
      privacySection: "Privacy & Anonymous Telemetry",
      analyticsToggle: "Enable Anonymous Analytics",
      analyticsActiveDesc:
        "Sending only bucketed enums and random install_id with $process_person_profile: false.",
      analyticsOffDesc:
        "Telemetry disabled. Zero events are buffered or transmitted.",
      resetIdBtn: "Reset Analytics ID",
      installIdLabel: "Current install_id",
      notAssigned: "None (Pre-consent / Opted out)",
      auditLogTitle: "Live Sanitized Telemetry Audit Log",
      auditLogEmpty:
        "No events captured yet. Interact with controls after enabling consent to inspect payloads.",
      auditLogDisabled:
        "Enable anonymous analytics to inspect outgoing sanitized event payloads.",
      clearViewBtn: "Clear View",
    },
    consentModal: {
      title: "Help Improve VoltTray Anonymously",
      body: "Send anonymous usage data to help us fix Linux/Windows device detection and improve gaming & office battery estimates.",
      collectedTitle: "What is sent (only if you opt in)",
      collectedList:
        "Random install ID, OS & display server, generic device category, connection type, and bucketed battery/alert actions.",
      neverTitle: "Never collected",
      neverList:
        "Device model names, serials, MAC addresses, open game/window titles, file paths, or IP addresses.",
      acceptBtn: "Enable Anonymous Analytics",
      declineBtn: "Continue Without Analytics",
    },
    onboarding: {
      welcomeTitle: "Welcome to VoltTray",
      welcomeDesc:
        "See predictive gaming and office battery hours instead of guessing percentages across all your wireless gear.",
      scanTitle: "Peripheral Discovery",
      scanDesc:
        "Found 3 peripherals: Wireless Mouse (2.4GHz), Mechanical Keyboard (2.4GHz), and Wireless Headset (Bluetooth).",
      notificationsTitle: "Interrupt-Free Alerts",
      notificationsDesc:
        "Low-battery overlays stay in the corner without minimizing fullscreen games or meetings.",
      startupTitle: "Ready for Daily Routine",
      startupDesc:
        "Enable 80% battery health protection and end-of-day plug-in reminders.",
      nextBtn: "Continue",
      skipBtn: "Skip Setup",
      finishBtn: "Open Tray Widget",
    },
  },
  mn: {
    brand: "VoltTray",
    nav: {
      widget: "Трэй Виджет",
      devices: "Төхөөрөмж & Эрүүл мэнд",
      alerts: "Мэдэгдэл & Тост",
      settings: "Тохиргоо & Нууцлал",
    },
    scanDevices: "Төхөөрөмж хайх",
    scanning: "Хайж байна...",
    taskbar: {
      osLabelWin: "Windows 11 · Таскбар Трэй",
      osLabelLinuxWayland: "Linux · Wayland Самбар",
      osLabelLinuxX11: "Linux · X11 Систем Трэй",
      trayTooltip: "Трэй дээрх төхөөрөмжийг дарж виджет дээр нээнэ үү",
      openWidget: "Виджет нээх",
    },
    widget: {
      title: "Дагалдах Хэрэгслийн Батарей Хянагч",
      chargingEst: "Цэнэглэж байна... {mins} мин үлдсэн",
      dischargingEst: "Ажиллаж байна · {hours} цаг үлдсэн",
      pausedLimit: "80% хамгаалалтын хязгаарт зогссон",
      fullCharge: "Бүрэн цэнэглэгдсэн (100%)",
      lowBatteryWarning: "Цэнэг маш бага! Яаралтай залгана уу",
      criticalBatteryWarning: "Цэнэг дуусаж байна! Одоо залгана уу",
      turnOffRgbShort: "RGB унтраах (+{h}ц)",
      rgbTurnedOff: "RGB унтарсан (+{h}ц хэмнэлт)",
      healthLabel: "Эрүүл мэнд",
      dpiBtn: "DPI",
      muteBtn: "Дуу хаах",
      unmuteBtn: "Хаалттай",
      trickBtn: "Эко горим",
      ecoOptimizerTitle: "Цагийн Баримжаа ба Эко Оновчлол",
      estimatedPrefix: "Тооцоолсон",
      gaming: "Тоглоход",
      office: "Ажиллахад",
      smartOptLabel: "Ухаалаг цэнэг хэмнэлтийн санал",
      turnOffRgbFull: "RGB гэрэл унтраах (+{h} цаг нэмнэ)",
      sleepTimerTitle: "Унтах горимын таймер",
      sleepTimerDesc: "Ашиглаагүй үед автоматаар амраах хугацаа",
      minutesUnit: "{m} мин",
      disabledUnit: "Унтарсан",
      connectionHealthTitle: "Холболт & Батарейн Эрүүл Мэнд",
      degradationLimitTitle: "80% элэгдлийн хязгаар",
      degradationLimitDesc:
        "Батарейн насжилтыг хамгаалахын тулд 80% дээр цэнэг зогсооно",
      chargeTo100Once: "Нэг удаа 100% хүртэл цэнэглэх",
      overrideActive: "Энэ удаад 100% хүртэл цэнэглэх горим идэвхтэй",
      pollingRate: "Polling давтамж",
    },
    connections: {
      usb_dongle_2_4ghz: "2.4GHz USB Dongle",
      bluetooth: "Bluetooth",
      wired_usb: "Утастай (Цэнэглэж буй)",
      unknown: "Тодорхойгүй",
    },
    devicesView: {
      title: "Холбогдсон Төхөөрөмж & Батарейн Эрүүл Мэнд",
      subtitle:
        "Windows болон Linux дээрх утасгүй холболт, цэнэг зарцуулалт ба 80% хамгаалалтыг удирдах.",
      transportImpact: "Холболтын төрөл",
      driverLabel: "Протокол драйвер",
      simulateDischarge: "Цэнэг -10%",
      plugInUsb: "USB залгах",
      unplugUsb: "USB салгах",
      disconnectBtn: "Амраах / Салгах",
      reconnectBtn: "Дахин холбох",
      inspectHealth: "Эрүүл мэнд харах",
      healthModalTitle: "Батарейн Эрүүл Мэнд & Насжилт",
      healthModalDesc:
        "Цэнэглэлтийн мөчлөгөөс хамаарсан багтаамжийн үзүүлэлт. 80% хязгаар нь батарейн насжилтыг уртасгана.",
      linuxUdevNotice:
        "Linux HID++ udev эрх: RGB болон унтах таймер удирдахад төхөөрөмжийн бичих эрх шаардлагатай.",
      fixUdevBtn: "udev эрх олгох",
    },
    alertsView: {
      title: "Тоглоом/Ажил Таслахгүй Мэдэгдэл ба Өдрийн Төгсгөлийн Сануулга",
      subtitle:
        "Нэг шийдвэр гаргах функц alert_shown эсвэл alert_suppressed-ийн зөвхөн нэгийг илгээнэ.",
      fullscreenMode: "Бүтэн дэлгэцийн Тоглоом / Хурал идэвхтэй",
      fullscreenDesc:
        "Бүтэн дэлгэцийн горимыг OS цонхны төлөвөөр шалгана (программын нэр цуглуулахгүй).",
      suppressInFullscreen: "Бүтэн дэлгэц үед тост мэдэгдлийг хориглох",
      dndMode: "Бүү саад бол (DND)",
      inGameOverlay: "Тоглоом дундах булангийн тост",
      triggerLowBattery: "Бага цэнэг шалгах (15%)",
      triggerEndOfDay: "Компьютер түгжих сануулга",
      triggerLimit80: "80% хязгаарт хүрсэн мэдэгдэл",
      lastDecision: "Сүүлийн мэдэгдлийн шийдвэр",
      shownStatus: "Харуулсан",
      suppressedStatus: "Хаагдсан",
      overlayTitleLow: "{device} цэнэг бага ({pct}% үлдсэн)",
      muteRgbAction: "RGB унтраах (+2ц)",
      ignoreAction: "Алгасах",
      eodTitle: "Компьютероо түгжих гэж байна уу?",
      eodBody:
        "Маргааш бэлэн байлгахын тулд {device} ({pct}% үлдсэн)-ээ цэнэгт залгахыг зөвлөж байна!",
      plugInNow: "Залгасан",
      remindMe: "Сануулах",
      limit80Title: "80% цэнэгийн хязгаарт хүрлээ ({device})",
      limit80Body:
        "Батарейн эрүүл мэндийг хамгаалах үүднээс цэнэглэлтийг 80% дээр зогсоолоо.",
      unplugAt80: "Утсаа салгах",
      chargeOnce100: "Нэг удаа 100% цэнэглэх",
    },
    settingsView: {
      title: "Тохиргоо, Орчин & Нууцлалын Хяналт",
      subtitle:
        "Зөвхөн зөвшөөрөл өгсөн үед PostHog EU стандартын дагуу нэргүй өгөгдөл илгээнэ.",
      envSection: "Системийн Орчны Тохируулга",
      osPlatform: "Үйлдлийн систем",
      displayServer: "Дэлгэцийн сервер",
      language: "Программын хэл",
      preferencesSection: "Ерөнхий Тохиргоо",
      launchAtLogin: "Систем асахад хамт эхлэх",
      notificationsEnabled: "Дэлгэцийн мэдэгдэл",
      endOfDayPrompt: "Өдрийн төгсгөлийн сануулга",
      lowThreshold: "Бага цэнэгийн анхааруулах босго",
      checkUpdate: "Шинэчлэлт шалгах (v1.0.1)",
      privacySection: "Нууцлал & Нэргүй Аналитик",
      analyticsToggle: "Нэргүй аналитик зөвшөөрөх",
      analyticsActiveDesc:
        "Зөвхөн ангилсан enum болон санамсаргүй install_id-г $process_person_profile: false горимоор илгээж байна.",
      analyticsOffDesc:
        "Аналитик унтарсан. Ямар ч өгөгдөл хадгалахгүй, илгээхгүй.",
      resetIdBtn: "Analytics ID шинэчлэх",
      installIdLabel: "Одоогийн install_id",
      notAssigned: "Байхгүй (Зөвшөөрөл өгөөгүй)",
      auditLogTitle: "Илгээгдсэн Нэргүй Эвентийн Аудит Лог",
      auditLogEmpty:
        "Одоогоор эвент бүртгэгдээгүй байна. Зөвшөөрөл өгөөд үйлдэл хийнэ үү.",
      auditLogDisabled:
        "Илгээгдэж буй өгөгдлийг шалгахын тулд нэргүй аналитикийг идэвхжүүлнэ үү.",
      clearViewBtn: "Цэвэрлэх",
    },
    consentModal: {
      title: "VoltTray-г сайжруулахад нэргүйгээр туслах уу?",
      body: "Windows/Linux төхөөрөмж таних болон тоглоом, оффисын цэнэгийн тооцооллыг сайжруулахын тулд нэргүй хэрэглээний өгөгдөл илгээнэ.",
      collectedTitle: "Цуглуулах өгөгдөл (зөвхөн зөвшөөрвөл)",
      collectedList:
        "Санамсаргүй install ID, OS ба display server, төхөөрөмжийн ерөнхий төрөл, холболтын төрөл, ангилсан цэнэг/мэдэгдлийн үйлдэл.",
      neverTitle: "Хэзээ ч цуглуулахгүй",
      neverList:
        "Төхөөрөмжийн нэр, серийн дугаар, MAC хаяг, нээлттэй тоглоом/цонхны нэр, файлын зам, IP хаяг.",
      acceptBtn: "Нэргүй аналитик зөвшөөрөх",
      declineBtn: "Зөвшөөрөлгүйгээр үргэлжлүүлэх",
    },
    onboarding: {
      welcomeTitle: "VoltTray-д тавтай морил",
      welcomeDesc:
        "Утасгүй хулгана, гар, чихэвчний цэнэгийг зөвхөн хувиар бус тоглох ба ажиллах бодит цагаар харна уу.",
      scanTitle: "Төхөөрөмж илрүүлэлт",
      scanDesc:
        "3 төхөөрөмж олдлоо: Утасгүй хулгана (2.4GHz), Гар (2.4GHz), Чихэвч (Bluetooth).",
      notificationsTitle: "Тасалдалгүй мэдэгдэл",
      notificationsDesc:
        "Тоглоом эсвэл хурлыг таслалгүйгээр дэлгэцийн буланд мэдэгдэл харуулна.",
      startupTitle: "Өдөр тутмын хамгаалалт",
      startupDesc:
        "80% батарейн эрүүл мэндийн хязгаар болон өдрийн төгсгөлийн сануулгыг идэвхжүүлээрэй.",
      nextBtn: "Үргэлжлүүлэх",
      skipBtn: "Алгасах",
      finishBtn: "Виджет нээх",
    },
  },
};
