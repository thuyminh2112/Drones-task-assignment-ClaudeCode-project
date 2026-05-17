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
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 11 }}
            labelFormatter={(v) => `Update ${v}`}
            formatter={(v) => [Number(v).toFixed(2), "Reward"]}
          />
          <Line
            type="monotone"
            dataKey="reward"
            stroke="#6366f1"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
