# Contributing to @fourjs/cache

Thank you for your interest in contributing to @fourjs/cache! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Getting Started

1. **Clone the repository**
```bash
git clone https://github.com/fourjs/cache.git
cd cache-module
```

1. **Install dependencies**
```bash
npm install
```

1. **Build the project**
```bash
npm run build
```

1. **Run tests**
```bash
npm test
```

## Development Workflow

### Project Structure

```
cache-module/
├── src/
│   ├── adapters/         # Storage adapters (Memory, Redis, etc.)
│   ├── components/       # React components
│   ├── config/          # Configuration
│   ├── events/          # Event system
│   ├── implementations/ # Core implementations
│   ├── interfaces/      # TypeScript interfaces
│   ├── react/          # React integration
│   ├── tests/          # Test files
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── examples/           # Usage examples
└── docs/              # Documentation
```

### Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint` to check code style
- Run `npm run format` to automatically fix formatting issues

### TypeScript Guidelines

1. **Type Safety**
   - Avoid using `any` where possible
   - Use generics for flexible typing
   - Document complex types with JSDoc comments

2. **Naming Conventions**
   - Use PascalCase for interfaces and types
   - Use camelCase for variables and functions
   - Use UPPER_CASE for constants

3. **File Organization**
   - One class/interface per file
   - Group related functionality in directories
   - Keep files under 350 lines

### Testing

1. **Unit Tests**
```bash
npm run test:unit
```

1. **Integration Tests**
```bash
npm run test:integration
```

1. **React Component Tests**
```bash
npm run test:components
```

1. **Coverage Report**
```bash
npm run test:coverage
```

### Performance Testing

1. **Run benchmarks**
```bash
npm run benchmark
```

1. **Profile memory usage**
```bash
npm run profile:memory
```

## Pull Request Process

1. **Create a branch**
```bash
git checkout -b feature/your-feature-name
```

1. **Make your changes**
   - Write tests for new functionality
   - Update documentation as needed
   - Follow code style guidelines

2. **Commit your changes**
```bash
git add .
git commit -m "feat: description of your changes"
```

1. **Run checks**
```bash
npm run verify # Runs lint, type check, and tests
```

1. **Push and create PR**
```bash
git push origin feature/your-feature-name
```

### Commit Message Guidelines

We follow conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `perf:` Performance improvements
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Documentation

### JSDoc Comments

- Add JSDoc comments for all public APIs
- Include parameter descriptions
- Document return types
- Add examples for complex functionality

Example:
```typescript
/**
 * Retrieves a value from cache with automatic refresh handling
 * 
 * @param key - The cache key to retrieve
 * @param options - Cache operation options
 * @returns Promise resolving to cached value or null
 * 
 * @example
 * ```typescript
 * const value = await cache.get('user:123', {
 *   backgroundRefresh: true,
 *   ttl: 3600
 * });
 * ```
 */
async function get<T>(key: string, options?: CacheOptions): Promise<T | null>
```

### README Updates

- Document all major changes in README.md
- Keep examples up to date
- Update API documentation

## Release Process

1. **Update version**
```bash
npm version [patch|minor|major]
```

1. **Generate changelog**
```bash
npm run changelog
```

1. **Build and test**
```bash
npm run build
npm test
```

1. **Publish**
```bash
npm publish
```

## Getting Help

- Open an issue for bugs or feature requests
- Join our Discord channel for discussions
- Check existing documentation and issues first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.