import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    service = new LoggerService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log a message', () => {
    const message = 'Test message';
    const mockLogger = jest.fn();
    service.logger.log = mockLogger;
    service.log(message);
    expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining(message));
  });

  it('should log a warning', () => {
    const message = 'Test warning';
    const mockLogger = jest.fn();
    service.logger.warn = mockLogger;
    service.warn(message);
    expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining(message));
  });

  it('should log an error', () => {
    const message = 'Test error';
    const mockLogger = jest.fn();
    service.logger.error = mockLogger;
    service.error(message);
    expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining(message));
  });
});
