import { parseJsonConfigFileContent } from "typescript";

const columns = 0;
const character = '$'

async function main() {

  console.clear()
  process.stdout.write('\u001B[?25l');

  const rows = process.stdout.rows

  for (let row = 0; row < rows; row++){

    process.stdout.cursorTo(columns, row )
    process.stdout.write(character)

    await new Promise(resolve => setTimeout(resolve, 1001))

    process.stdout.cursorTo(columns , row)
    process.stdout.write(' ')
  }

  process.stderr.write('\x1B[?25h')
}

main()
