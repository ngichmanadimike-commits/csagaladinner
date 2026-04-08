import { useEffect, useState } from "react";

interface Props {
  targetDate: string;
}

const CountdownTimer = ({ targetDate }: Props) => {
  const calcTime = () => {
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };

  const [time, setTime] = useState(calcTime);
  useEffect(() => {
    const id = setInterval(() => setTime(calcTime), 1000);
    return () => clearInterval(id);
  }, []);

  const units = [
    { label: "Days", value: time.days },
    { label: "Hours", value: time.hours },
    { label: "Minutes", value: time.minutes },
    { label: "Seconds", value: time.seconds },
  ];

  return (
    <div className="flex justify-center gap-4 md:gap-6">
      {units.map((u) => (
        <div key={u.label} className="glass rounded-xl px-4 py-3 md:px-6 md:py-4 min-w-[70px] md:min-w-[90px] text-center">
          <div className="font-display text-2xl md:text-4xl font-bold text-primary">
            {String(u.value).padStart(2, "0")}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{u.label}</div>
        </div>
      ))}
    </div>
  );
};

export default CountdownTimer;
