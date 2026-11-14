# USB гар/хулганын танилтын засвар

## Батлагдсан шалтгаан

Өмнөх TS/Rust probe нь нэр танигдаагүй үед `mouse` сонгож, танил USB vendor ID байвал `2.4GHz` гэж үздэг байсан. Мөн нэг USB портын эхний таарсан HID interface-ийг сонгож байсан тул enumeration дарааллаас хамаардаг байв. Ижил төрлийн өөр төхөөрөмж батарей мэдээлдэг байхад бүх battery-unavailable мөрийг ангиллаар нь дарах merge дүрэм байсан.

## Локал hardware нотолгоо

`lsusb`, `lsusb -t`, HID sysfs, `udevadm info`-г тулгаж шалгасан:

| VID:PID | Төхөөрөмж | Үндсэн boot interface | Засварын дараах үр дүн |
| --- | --- | --- | --- |
| `258a:013b` | Sino Wealth DIERYA DK68SE | Interface 00, subclass 01, protocol 01 | keyboard / wired_usb |
| `249a:5c2f` | XCTECH Wireless-Receiver | Interface 00, subclass 01, protocol 02 | mouse / usb_dongle_2_4ghz |

DK68SE-ийн нэмэлт interface нь mouse input мөн зарладаг. XCTECH-ийн нэмэлт interface нь keyboard input зарладаг. Тиймээс дурын нэг input event эсвэл нэрээр бүх төхөөрөмжийг ангилахгүй: хамгийн бага дугаартай boot interface-ийг тэргүүлнэ. Энэ нь физик төхөөрөмжийн үндсэн USB үүргийн сонголт; олон төхөөрөмж хүлээж авдаг receiver-ийн цаадах төхөөрөмж бүрийг илрүүлсэн гэсэн үг биш.

## Өөрчлөлт

- `src/server/hardware/providers/usbIdentity.ts`, `src-tauri/src/hardware/usb_identity.rs`: lsusb VID:PID нэрийн fallback болон USB interface descriptor уншилт.
- `src/server/hardware/linuxProbe.ts`, `src-tauri/src/hardware/mod.rs`: primary boot interface-ээр гар/хулганыг ангилах; vendor-аар wireless гэж таахгүй; мэдэхгүй төрлийг unknown болгох; порт/HID ID identity; unrelated USB мөрийг зөвхөн category-аар нуухгүй.
- USB холболт, нэр, descriptor нь батарейн хувь биш. Одоогийн provider хувь буцаагаагүй хоёр төхөөрөмж `batteryAvailable: false` хэвээр. Дэмжигдээгүй proprietary protocol эсвэл hardware-ийн battery report боломжийг тусад нь шалгах шаардлагатай.
- `lsusb` байхгүй үед sysfs/HID уншилт үргэлжилнэ. Arch дээр `lsusb` нь `usbutils` багцын команд.

## btop++ fork ба судалгаа

[ZERO1zx1/btop](https://github.com/ZERO1zx1/btop) fork үүсгэж, upstream parent нь `aristocratos/btop` болохыг GitHub metadata-аар баталсан. Локал хуулбар `/home/light/Projects/btop`-д тусдаа байрлана; VoltTray-ийн source/build-д оруулаагүй.

Шалгасан commit: `5d03929a45e0720a4c8e2d189360ff1eb9ce1731`. [Linux get_battery эх код](https://github.com/aristocratos/btop/blob/5d03929a45e0720a4c8e2d189360ff1eb9ce1731/src/linux/btop_collect.cpp#L835) нь `/sys/class/power_supply`-ийн Battery/UPS, present, energy/charge/capacity утгыг уншдаг. Энэ функц гар/хулганын USB танилтыг шийдэхгүй. btop-ийн кодыг VoltTray-д хуулбарлаагүй; fork нь тусдаа Apache-2.0 төсөл хэвээр.

## Шалгалт

- TypeScript lint: PASS.
- npm tests: 24 PASS; DK68SE/XCTECH interface дараалал, wired/wireless ялгалт, unrelated keyboard merge regression багтсан.
- Rust tests: 4 PASS, USB boot protocol regression багтсан.
- Локал TS hardware probe: дээрх хоёр төхөөрөмжийн төрөл/холболт хүснэгттэй тохирсон. Native adapter compile болон unit tests амжилттай; UI дээрх эцсийн харагдацыг тусад нь батална.

Хөгжүүлэлтийн апп Rust өөрчлөлтийг дахин build хийж ачаална. Хуучин release tray процесс ажиллаж байвал түүний код автоматаар шинэчлэгдэхгүй; шинэ dev widget дээр Refresh ашиглана.
