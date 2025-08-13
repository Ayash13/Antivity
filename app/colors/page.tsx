"use client"

import { Card, CardContent } from "@/components/ui/card"

const swatches = [
  { name: "antivity.purple", className: "bg-antivity-purple" },
  { name: "antivity.brightBlue", className: "bg-antivity-brightBlue" },
  { name: "antivity.secondaryBlue", className: "bg-antivity-secondaryBlue" },
  { name: "antivity.green", className: "bg-antivity-green" },
  { name: "antivity.lightBlue", className: "bg-antivity-lightBlue border" },
]

export default function ColorsPage() {
  return (
    <main className="min-h-dvh bg-white text-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-2">Antivity Colors</h1>
      <p className="text-gray-600 mb-6">
        Use with Tailwind classes like <code>bg-antivity-purple</code>, <code>text-antivity-brightBlue</code>, etc.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {swatches.map((s) => (
          <Card key={s.name} className="overflow-hidden">
            <div className={`h-24 ${s.className}`} />
            <CardContent className="flex items-center justify-between py-3">
              <div className="font-mono text-sm">{s.name}</div>
              <div className="text-xs text-gray-500">bg/text/border/ring utilities</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Examples</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 rounded-full bg-antivity-purple text-white">Primary</button>
          <button className="px-4 py-2 rounded-full bg-antivity-brightBlue text-gray-900">Accent</button>
          <button className="px-4 py-2 rounded-full bg-antivity-secondaryBlue text-white">Secondary</button>
          <button className="px-4 py-2 rounded-full bg-antivity-green text-white">Success</button>
          <button className="px-4 py-2 rounded-full bg-antivity-lightBlue text-gray-900 border border-gray-200">
            Subtle
          </button>
        </div>
      </div>
    </main>
  )
}
