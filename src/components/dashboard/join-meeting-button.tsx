"use client"

import { useState, useEffect } from "react"
import { Video } from "lucide-react"

const JOIN_WINDOW_MINUTES_BEFORE = 15

function isInJoinWindow(
  appointmentDate: string,
  appointmentTime: string,
  durationMinutes: number,
  now: Date
): boolean {
  const start = new Date(`${appointmentDate}T${appointmentTime}`)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  const windowStart = new Date(start.getTime() - JOIN_WINDOW_MINUTES_BEFORE * 60 * 1000)
  return now >= windowStart && now <= end
}

interface JoinMeetingButtonProps {
  meetingLink: string
  appointmentDate: string
  appointmentTime: string
  durationMinutes?: number
  size?: "sm" | "md"
}

export function JoinMeetingButton({
  meetingLink,
  appointmentDate,
  appointmentTime,
  durationMinutes = 60,
  size = "md",
}: JoinMeetingButtonProps) {
  const [canJoin, setCanJoin] = useState(false)

  useEffect(() => {
    const check = () => {
      setCanJoin(
        isInJoinWindow(appointmentDate, appointmentTime, durationMinutes, new Date())
      )
    }
    check()
    const interval = setInterval(check, 60 * 1000) // Revisar cada minuto
    return () => clearInterval(interval)
  }, [appointmentDate, appointmentTime, durationMinutes])

  if (!canJoin) return null

  const sizeClasses =
    size === "sm"
      ? "px-3 py-1.5 text-xs gap-1.5"
      : "px-4 py-2 text-sm gap-2"

  return (
    <a
      href={meetingLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors cursor-pointer ${sizeClasses}`}
      onClick={(e) => e.stopPropagation()}
    >
      <Video className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />
      Unirse a la reunión
    </a>
  )
}
