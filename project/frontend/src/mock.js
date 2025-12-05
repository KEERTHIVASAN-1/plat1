// ----------------------------------------------------------
// USERS
// ----------------------------------------------------------


// ----------------------------------------------------------
// PROBLEMS (UPDATED)
// ----------------------------------------------------------


// ----------------------------------------------------------
// ROUND INFO (uses updated problems)
// ----------------------------------------------------------


// ----------------------------------------------------------
// PARTICIPANTS
// ----------------------------------------------------------


// ----------------------------------------------------------
// LANGUAGE OPTIONS
// ----------------------------------------------------------

export const languageOptions = [
  {
    value: 'python',
    label: 'Python 3',
    template:
      '# Write your code here\n' +
      'import sys\n' +
      'def solution():\n' +
      '    data = sys.stdin.read().strip()\n' +
      '    # parse input from `data` and print result\n' +
      '    # print(<result>)\n' +
      '\n' +
      'if __name__ == "__main__":\n' +
      '    solution()'
  },
  {
    value: 'javascript',
    label: 'JavaScript',
    template:
      '// Write your code here\n' +
      'const fs = require("fs");\n' +
      'function solution() {\n' +
      '  const data = fs.readFileSync(0, "utf8").trim();\n' +
      '  // parse input from `data` and console.log result\n' +
      '  // console.log(result)\n' +
      '}\n' +
      'solution();'
  },
  {
    value: 'cpp',
    label: 'C++',
    template:
      '#include <bits/stdc++.h>\n' +
      'using namespace std;\n' +
      'int main(){\n' +
      '  ios::sync_with_stdio(false); cin.tie(nullptr);\n' +
      '  string line, data;\n' +
      '  while (getline(cin, line)) { if (!data.empty()) data += "\n"; data += line; }\n' +
      '  // parse input from `data` and output result\n' +
      '  // cout << result;\n' +
      '  return 0;\n' +
      '}'
  },
  {
    value: 'java',
    label: 'Java',
    template:
      'import java.io.*;\n' +
      'public class Solution {\n' +
      '  public static void main(String[] args) throws Exception {\n' +
      '    String data = new String(System.in.readAllBytes()).trim();\n' +
      '    // parse `data` and print result\n' +
      '    // System.out.print(result);\n' +
      '  }\n' +
      '}'
  }
];
