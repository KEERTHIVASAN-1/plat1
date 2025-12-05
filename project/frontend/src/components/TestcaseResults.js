import React from 'react';
import { CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

const TestcaseResults = ({ results, previewOpen = [], previewHiddenCount = 0 }) => {
  if (!results || results.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Testcase Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {previewOpen.length > 0 ? (
              <div className="space-y-2">
                {previewOpen.slice(0, 2).map((tc, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Open {i + 1}</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="font-medium text-gray-600">Input:</span>
                        <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">{tc.input}</pre>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Expected:</span>
                        <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">{tc.output}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Run your code to see testcase results
              </p>
            )}
            {previewHiddenCount > 0 && (
              <div className="p-3 rounded-lg border bg-gray-50">
                <div className="flex items-center space-x-2">
                  <EyeOff className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Hidden testcases: {previewHiddenCount}</span>
                </div>
              </div>
            )}
          </div>
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
                    <span className="text-sm font-medium">{result.testcase || `Test Case ${idx + 1}`}</span>
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
