declare module 'hanzi-writer' {
  export default class HanziWriter {
    static create(element: HTMLElement, character: string, options?: any): HanziWriter
    setCharacter(character: string): void
    animateCharacter(): Promise<void>
    showNextStroke(): Promise<void>
    reset(): void
    quiz(options?: any): void
    destroy(): void
    setOptions(options: any): void
  }
} 