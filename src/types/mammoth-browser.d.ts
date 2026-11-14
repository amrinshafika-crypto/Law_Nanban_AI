declare module 'mammoth/mammoth.browser.js' {
  const mammoth: {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>;
  };
  export default mammoth;
}

declare module '*?url' {
  const url: string;
  export default url;
}
