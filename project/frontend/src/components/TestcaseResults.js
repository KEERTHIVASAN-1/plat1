import React from 'react';
import { CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

const TestcaseResults = ({ results, testcases = [] }) => {
  if (!results || results.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Available Testcases</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {testcases && testcases.length ? (
                testcases.map((tc, idx) => {
                  const hidden = !!tc.hidden;
                  const input = tc.input || tc.stdin || "";
                  const expected = tc.expectedOutput || tc.output || tc.expected || "";
                  return (
                    <div key={idx} className="p-3 rounded-lg border bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Test Case {idx + 1}</span>
                        </div>
                        {hidden ? (
                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                            <EyeOff className="h-3 w-3" />
                            <span>Hidden</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                            <Eye className="h-3 w-3" />
                            <span>Open</span>
                          </div>
                        )}
                      </div>
                      {!hidden && (
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="font-medium text-gray-600">Input:</span>
                            <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">{input}</pre>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Expected:</span>
                            <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">{expected}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No testcases</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Testcase Results</CardTitle>
          <Badge variant={passedCount === totalCount ? 'default' : 'secondary'}>
            {passedCount}/{totalCount} Passed
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  result.passed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {result.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      Test Case {result.testcase}
                    </span>
                  </div>
                  {result.hidden && (
                    <div className="flex items-center space-x-1 text-xs text-gray-600">
                      <EyeOff className="h-3 w-3" />
                      <span>Hidden</span>
                    </div>
                  )}
                </div>

                {!result.hidden && (
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">Input:</span>
                      <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                        {result.input}
                      </pre>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Expected:</span>
                      <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                        {result.expectedOutput}
                      </pre>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Actual:</span>
                      <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                        {result.actualOutput}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TestcaseResults;
