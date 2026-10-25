import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { fefe, type RunResult } from "./fefe"
import { GLYPHS } from "./symbols"

interface Level {
  pairs: number
  cols: number
  seconds: number
}

const LEVELS: Level[] = [
  { pairs: 6, cols: 4, seconds: 45 },
  { pairs: 8, cols: 4, seconds: 60 },
  { pairs: 10, cols: 5, seconds: 75 },
]

interface Card {
  id: number
  glyph: number
  matched: boolean
}

type Phase = "menu" | "play" | "cleared" | "over"

function shuffle<T>(items: T[]): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function deal(level: Level): Card[] {
  const glyphs = shuffle(GLYPHS.map((_, i) => i)).slice(0, level.pairs)
  return shuffle([...glyphs, ...glyphs]).map((glyph, id) => ({ id, glyph, matched: false }))
}

const STATUS_TEXT: Record<RunResult["status"], string> = {
  saved: "New best! Saved to the Fefe leaderboard.",
  kept: "Your best score on the leaderboard still stands.",
  guest: "Sign in to Fefe to put your score on the leaderboard.",
  offline: "Offline. Your best is saved on this device.",
  error: "Couldn't reach the leaderboard. Your best is saved on this device.",
}

export function App() {
  const [phase, setPhase] = useState<Phase>("menu")
  const [levelIndex, setLevelIndex] = useState(0)
  const [cards, setCards] = useState<Card[]>([])
  const [open, setOpen] = useState<number[]>([])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [moves, setMoves] = useState(0)
  const [best, setBest] = useState(() => fefe.localBest())
  const [result, setResult] = useState<RunResult | null>(null)
  const [won, setWon] = useState(false)
  const lock = useRef(false)

  const level = LEVELS[levelIndex]

  const startLevel = useCallback((index: number) => {
    setLevelIndex(index)
    setCards(deal(LEVELS[index]))
    setOpen([])
    setCombo(0)
    setTimeLeft(LEVELS[index].seconds)
    lock.current = false
    setPhase("play")
  }, [])

  const startRun = useCallback(() => {
    setScore(0)
    setMoves(0)
    setResult(null)
    setWon(false)
    startLevel(0)
  }, [startLevel])

  const endRun = useCallback(
    (finalScore: number, didWin: boolean) => {
      setWon(didWin)
      setPhase("over")
      fefe
        .finishRun(finalScore, { level: levelIndex + 1, moves, cleared: didWin })
        .then((r) => {
          setResult(r)
          setBest(r.best)
        })
    },
    [levelIndex, moves],
  )

  // Countdown
  useEffect(() => {
    if (phase !== "play") return
    if (timeLeft <= 0) {
      endRun(score, false)
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, timeLeft, score, endRun])

  // Level cleared
  useEffect(() => {
    if (phase !== "play" || cards.length === 0 || !cards.every((c) => c.matched)) return
    const total = score + timeLeft * 10
    setScore(total)
    if (levelIndex === LEVELS.length - 1) {
      endRun(total, true)
    } else {
      setPhase("cleared")
      const id = setTimeout(() => startLevel(levelIndex + 1), 1400)
      return () => clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  const flip = (card: Card) => {
    if (phase !== "play" || lock.current || card.matched || open.includes(card.id)) return
    const next = [...open, card.id]
    setOpen(next)
    if (next.length < 2) return

    setMoves((m) => m + 1)
    const [a, b] = next.map((id) => cards[id])
    if (a.glyph === b.glyph) {
      const gained = 100 * (combo + 1)
      setCombo((c) => c + 1)
      setScore((s) => s + gained)
      setCards((cs) => cs.map((c) => (c.glyph === a.glyph ? { ...c, matched: true } : c)))
      setOpen([])
    } else {
      setCombo(0)
      lock.current = true
      setTimeout(() => {
        setOpen([])
        lock.current = false
      }, 700)
    }
  }

  const me = fefe.playerId()
  const urgent = phase === "play" && timeLeft <= 10

  const grid = useMemo(
    () => ({ gridTemplateColumns: "repeat(" + level.cols + ", 1fr)" }),
    [level.cols],
  )

  return (
    <main className="app">
      <header className="hud">
        <div className="stat">
          <span>Level</span>
          <b>
            {levelIndex + 1}/{LEVELS.length}
          </b>
        </div>
        <div className={"stat" + (urgent ? " urgent" : "")}>
          <span>Time</span>
          <b>{timeLeft}s</b>
        </div>
        <div className="stat">
          <span>Score</span>
          <b>{score}</b>
        </div>
        <div className="stat">
          <span>Best</span>
          <b>{best}</b>
        </div>
      </header>

      {combo > 1 && phase === "play" && <div className="combo">Combo ×{combo}</div>}

      <section className="board" style={grid} aria-label="Cards">
        {cards.map((card) => {
          const faceUp = card.matched || open.includes(card.id)
          const glyph = GLYPHS[card.glyph]
          return (
            <button
              key={card.id}
              className={"card" + (faceUp ? " up" : "") + (card.matched ? " matched" : "")}
              onClick={() => flip(card)}
              aria-label={faceUp ? glyph.name : "Hidden card"}
            >
              <span className="inner">
                <span className="face back" />
                <span className="face front">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {glyph.path}
                  </svg>
                  <small>{glyph.name}</small>
                </span>
              </span>
            </button>
          )
        })}
      </section>

      {phase === "menu" && (
        <div className="overlay">
          <div className="panel">
            <h1>Adinkra Match</h1>
            <p>Match the Adinkra symbols before time runs out. Chain matches for a combo, and finish early for a time bonus.</p>
            <button className="btn" onClick={startRun}>
              Play
            </button>
            <p className="who">
              {fefe.isSignedIn()
                ? "Signed in. Your best score goes on the Fefe leaderboard."
                : "Playing as a guest. Sign in to Fefe to save your scores."}
            </p>
          </div>
        </div>
      )}

      {phase === "cleared" && (
        <div className="overlay soft">
          <div className="panel small">
            <h2>Level {levelIndex + 1} cleared!</h2>
            <p>Time bonus +{timeLeft * 10}</p>
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className="overlay">
          <div className="panel">
            <h2>{won ? "All levels cleared!" : "Time's up!"}</h2>
            <p className="final">
              {score}
              <small>points</small>
            </p>
            <p className="who">{result ? STATUS_TEXT[result.status] : "Saving…"}</p>
            <div className="leaders">
              <h3>Leaderboard</h3>
              {!result ? (
                <p className="muted">Loading…</p>
              ) : !result.entries?.length ? (
                <p className="muted">
                  {!result.board
                    ? "Leaderboard unavailable offline"
                    : result.entries
                      ? "No scores yet. Be the first!"
                      : "Couldn't load the leaderboard"}
                </p>
              ) : (
                <ol>
                  {result.entries.map((e) => (
                    <li key={e.player_id} className={e.player_id === me ? "me" : ""}>
                      <span className="rk">{e.rank}</span>
                      <span className="nm">{e.username || "Player"}</span>
                      <span className="sc">{Math.round(e.score)}</span>
                    </li>
                  ))}
                </ol>
              )}
              {result?.me && (
                <p className="mine">
                  You're #{result.me.rank} with {Math.round(result.me.score)}
                </p>
              )}
            </div>
            <button className="btn" onClick={startRun}>
              Play again
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
