import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevModeApp } from './DevModeApp';

vi.mock('../hooks/useFileList', () => ({
  useFileList: () => ({
    files: [{ name: 'sample.v3.md', path: 'sample.v3.md', dir: '.' }],
    selectedFile: 'sample.v3.md',
    setSelectedFile: vi.fn(),
    reload: vi.fn(),
    loading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useMarkdown', () => ({
  useMarkdown: () => ({
    content: '# Sample\n',
    filename: 'sample.v3.md',
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    readonly: false,
    reload: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    deleteAllComments: vi.fn(),
    editComment: vi.fn(),
  }),
}));

vi.mock('../hooks/useFileWatch', () => ({
  useFileWatch: vi.fn(),
}));

vi.mock('../hooks/useResizable', () => ({
  useResizable: () => ({
    width: 240,
    isResizing: false,
    isCollapsed: false,
    handleMouseDown: vi.fn(),
    toggleCollapse: vi.fn(),
  }),
}));

vi.mock('./FileTree', () => ({
  FileTree: () => <div data-testid="file-tree" />,
}));

vi.mock('./MarkdownPreview', () => ({
  MarkdownPreview: () => <div data-testid="markdown-preview" />,
}));

vi.mock('./ThemeToggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

describe('DevModeApp', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('keeps the file tree open when no file is specified in the URL', () => {
    render(<DevModeApp />);

    expect(screen.getByTestId('file-tree')).toBeInTheDocument();
  });

  it('collapses the file tree by default when a file is specified in the URL', () => {
    window.history.replaceState(null, '', '/?file=sample.v3.md');

    render(<DevModeApp />);

    expect(screen.queryByTestId('file-tree')).not.toBeInTheDocument();
    expect(screen.getByTitle('Open sidebar')).toBeInTheDocument();
  });
});
