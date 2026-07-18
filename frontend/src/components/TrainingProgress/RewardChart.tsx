import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useSimStore } from "../../store/simStore";

export function RewardChart() {
  const history = useSimStore((s) => s.rewardHistory);

  if (history.length < 2) return null;

  return (
    <div className="h-32 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <XAxis
            dataKey="episode"
            tick={{ fill: "#898781", fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#898781", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{ background: "#fcfcfb", border: "1px solid #e1e0d9", fontSize: 11, color: "#0b0b0b" }}
            labelFormatter={(v) => `Update ${v}`}
            formatter={(v) => [Number(v).toFixed(2), "Reward"]}
          />
          <Line
            type="monotone"
            dataKey="reward"
            stroke="#4a3aa7"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
