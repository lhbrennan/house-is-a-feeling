export function createDefaultGrid(numChannels: number, maxSteps: number) {
    return Array.from({ length: numChannels }, () => Array(maxSteps).fill(false))
}