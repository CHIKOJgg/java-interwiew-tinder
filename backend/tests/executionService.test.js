import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockAxiosPost = vi.fn();

vi.mock('axios', () => ({
  default: { post: mockAxiosPost }
}));

vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() }
}));

describe('executionService', () => {
  let svc, logger;

  beforeAll(async () => {
    svc = await import('../src/services/executionService.js');
    logger = (await import('../src/config/logger.js')).default;
  });

  beforeEach(() => { vi.clearAllMocks(); });

  describe('executeCode', () => {
    it('executes code and returns output', async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: { run: { output: 'Hello\n', stderr: '', code: 0, signal: null } }
      });
      const result = await svc.executeCode({ code: 'console.log("Hi")', language: 'TypeScript' });
      expect(result.output).toBe('Hello\n');
      expect(result.exitCode).toBe(0);
    });

    it('throws on unsupported language', async () => {
      await expect(svc.executeCode({ code: 'x', language: 'Ruby' })).rejects.toThrow('Unsupported language: Ruby');
    });

    it('throws on code exceeding max length', async () => {
      const code = 'x'.repeat(5001);
      await expect(svc.executeCode({ code, language: 'Java' })).rejects.toThrow('Code too long');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('throws on denied Java patterns', async () => {
      await expect(svc.executeCode({ code: 'Runtime.getRuntime().exec("rm -rf /")', language: 'Java' }))
        .rejects.toThrow('is not allowed');
    });

    it('logs error on Piston API failure', async () => {
      const apiError = new Error('timeout');
      apiError.code = 'ECONNABORTED';
      mockAxiosPost.mockRejectedValueOnce(apiError);
      await expect(svc.executeCode({ code: 'print(1)', language: 'Python' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err: apiError }), 'Code execution timed out');
    });

    it('logs error on HTTP error response', async () => {
      const apiError = new Error('bad request');
      apiError.response = { status: 400 };
      mockAxiosPost.mockRejectedValueOnce(apiError);
      await expect(svc.executeCode({ code: 'print(1)', language: 'Python' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
