import dictionary from 'makemeahanzi/dictionary.txt'

export async function loadHanziData(character) {
  const data = await fetch(dictionary)
  const text = await data.text()
  const lines = text.split('\n')
  return lines.find(line => {
    const entry = JSON.parse(line)
    return entry.character === character
  })
} 