import { ChoiceType, CounterChoice, GainSource } from "../types/GameTypes"

export function createCountChoice(id: string, source: { type: GainSource; id: number; name: string }, initial: number, min: number, max: number, prompt: string): CounterChoice {
    return {
        id: id,
        prompt: prompt,
        initial,
        min,
        max,
        source,
        type: ChoiceType.COUNTER,
    }
}