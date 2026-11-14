import React from "react";
import {
  Battery,
  Bluetooth,
  Cable,
  Gamepad2,
  Headphones,
  Keyboard,
  Laptop,
  Mouse,
  Radio,
  Smartphone,
} from "lucide-react";
import type { ConnectionType, DeviceType } from "../../shared/types";

export const DeviceIcon: React.FC<{
  type: DeviceType;
  className?: string;
}> = ({ type, className = "w-5 h-5" }) => {
  switch (type) {
    case "laptop":
      return <Laptop className={className} aria-hidden="true" />;
    case "mouse":
      return <Mouse className={className} aria-hidden="true" />;
    case "keyboard":
      return <Keyboard className={className} aria-hidden="true" />;
    case "headset":
      return <Headphones className={className} aria-hidden="true" />;
    case "controller":
      return <Gamepad2 className={className} aria-hidden="true" />;
    case "other":
      return <Smartphone className={className} aria-hidden="true" />;
    default:
      return <Battery className={className} aria-hidden="true" />;
  }
};

export const TransportIcon: React.FC<{
  connectionType: ConnectionType;
  className?: string;
}> = ({ connectionType, className = "w-4 h-4" }) => {
  switch (connectionType) {
    case "bluetooth":
      return <Bluetooth className={className} aria-hidden="true" />;
    case "wired_usb":
      return <Cable className={className} aria-hidden="true" />;
    case "usb_dongle_2_4ghz":
    default:
      return <Radio className={className} aria-hidden="true" />;
  }
};
