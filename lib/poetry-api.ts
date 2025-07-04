import * as SQLite from 'expo-sqlite';
import { getTotalPoemsCount, getRandomPoems, getPoemsPage, addPoem } from './poems';

const POETRYDB_BASE_URL = 'https://poetrydb.org';

export interface PoetryDBPoem {
  title: string;
  author: string;
  lines: string[];
  linecount: number;
}

export interface SearchResult {
  poems: PoetryDBPoem[];
  total: number;
}

export interface PoemSession {
  poems: any[];
  currentIndex: number;
  hasMore: boolean;
}

export interface PoemWindow {
  poems: any[];           // Only 21 poems max
  currentIndex: number;   // Index within the window (0-20)
  globalIndex: number;    // Actual position in full dataset
  totalCount: number;
  windowStart: number;    // Global index where window starts
}

const WINDOW_SIZE = 21;  // Current + 10 before + 10 after
const BUFFER_SIZE = 10;

class PoetryAPIService {
  private async fetchPoems(endpoint: string): Promise<PoetryDBPoem[]> {
    try {
      const response = await fetch(`${POETRYDB_BASE_URL}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle the case where API returns error object
      if (data.status && data.reason) {
        throw new Error(data.reason);
      }
      
      // Ensure we have an array
      const poems = Array.isArray(data) ? data : [data];
      
      return poems.map(poem => ({
        title: poem.title || 'Untitled',
        author: poem.author || 'Unknown',
        lines: poem.lines || [],
        linecount: poem.linecount || poem.lines?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching poems:', error);
      throw error;
    }
  }

  // Search by author name (partial match)
  async searchByAuthor(authorName: string, limit = 10): Promise<SearchResult> {
    const encodedAuthor = encodeURIComponent(authorName);
    const endpoint = `/author,poemcount/${encodedAuthor};${limit}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Search by author name (exact match)
  async searchByAuthorExact(authorName: string, limit = 10): Promise<SearchResult> {
    const encodedAuthor = encodeURIComponent(authorName);
    const endpoint = `/author,poemcount/${encodedAuthor}:abs;${limit}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Search by poem title (partial match)
  async searchByTitle(title: string, limit = 10): Promise<SearchResult> {
    const encodedTitle = encodeURIComponent(title);
    const endpoint = `/title,poemcount/${encodedTitle};${limit}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Search by poem title (exact match)
  async searchByTitleExact(title: string): Promise<SearchResult> {
    const encodedTitle = encodeURIComponent(title);
    const endpoint = `/title/${encodedTitle}:abs`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Search by lines/content
  async searchByLines(searchText: string, limit = 10): Promise<SearchResult> {
    const encodedText = encodeURIComponent(searchText);
    const endpoint = `/lines,poemcount/${encodedText};${limit}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Search by line count
  async searchByLineCount(lineCount: number, limit = 10): Promise<SearchResult> {
    const endpoint = `/linecount,poemcount/${lineCount};${limit}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Get random poems
  async getRandomPoems(count = 5): Promise<SearchResult> {
    const endpoint = `/random/${count}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Get all poems by specific author (exact match)
  async getAuthorPoems(authorName: string, limit = 20): Promise<SearchResult> {
    const encodedAuthor = encodeURIComponent(authorName);
    const endpoint = `/author,poemcount/${encodedAuthor}:abs;${limit}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Get all available authors
  async getAuthors(): Promise<string[]> {
    try {
      const response = await fetch(`${POETRYDB_BASE_URL}/author`);
      const data = await response.json();
      return data.authors || [];
    } catch (error) {
      console.error('Error fetching authors:', error);
      return [];
    }
  }

  // Get all available titles
  async getTitles(): Promise<string[]> {
    try {
      const response = await fetch(`${POETRYDB_BASE_URL}/title`);
      const data = await response.json();
      return data.titles || [];
    } catch (error) {
      console.error('Error fetching titles:', error);
      return [];
    }
  }

  // Combined search: author + title
  async searchByAuthorAndTitle(authorName: string, title: string): Promise<SearchResult> {
    const encodedAuthor = encodeURIComponent(authorName);
    const encodedTitle = encodeURIComponent(title);
    const endpoint = `/author,title/${encodedAuthor};${encodedTitle}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Combined search: author + line count
  async searchByAuthorAndLineCount(authorName: string, lineCount: number, limit = 10): Promise<SearchResult> {
    const encodedAuthor = encodeURIComponent(authorName);
    const endpoint = `/author,linecount,poemcount/${encodedAuthor};${lineCount};${limit}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Combined search: title + line count
  async searchByTitleAndLineCount(title: string, lineCount: number, limit = 10): Promise<SearchResult> {
    const encodedTitle = encodeURIComponent(title);
    const endpoint = `/title,linecount,poemcount/${encodedTitle};${lineCount};${limit}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Get random poems with specific line count (like sonnets)
  async getRandomPoemsByLineCount(lineCount: number, count = 5): Promise<SearchResult> {
    const endpoint = `/linecount,random/${lineCount};${count}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Get random sonnets (14 lines) - convenience method
  async getRandomSonnets(count = 5): Promise<SearchResult> {
    return this.getRandomPoemsByLineCount(14, count);
  }

  // Get random Shakespeare poems
  async getRandomShakespeare(count = 5): Promise<SearchResult> {
    const endpoint = `/author,random/William Shakespeare;${count}`;
    
    const poems = await this.fetchPoems(endpoint);
    return {
      poems,
      total: poems.length
    };
  }

  // Convert PoetryDB poem to our local format
  convertToLocalFormat(poem: PoetryDBPoem): { title: string; author: string; content: string } {
    return {
      title: poem.title,
      author: poem.author,
      content: poem.lines.join('\n')
    };
  }

  // Hybrid method: get poems from both API and local DB
  async getHybridRandomPoems(count = 20): Promise<any[]> {
    try {
      // Try to get half from API, half from local
      const apiCount = Math.floor(count / 2);
      const localCount = count - apiCount;

      // Get poems from API
      const apiResult = await this.getRandomPoems(apiCount);
      const apiPoems = apiResult.poems.map(poem => this.convertToLocalFormat(poem));

      // Get poems from local database
      const localPoems = getRandomPoems(localCount);

      // Combine and return
      return [...apiPoems, ...localPoems];
    } catch (error) {
      console.warn('API request failed, falling back to local poems:', error);
      // Fallback to local poems only
      return getRandomPoems(count);
    }
  }

  // Save API poems to local database for offline access
  async saveToLocal(poems: PoetryDBPoem[]): Promise<void> {
    poems.forEach(poem => {
      const localFormat = this.convertToLocalFormat(poem);
      addPoem(localFormat.title, localFormat.author, localFormat.content);
    });
  }

  // Discovery method: get diverse random poems from different poets
  async getDiscoveryPoems(count = 20): Promise<any[]> {
    try {
      const poets = ['William Shakespeare', 'Emily Dickinson', 'Robert Frost', 'Maya Angelou', 'Langston Hughes'];
      const poemsPerPoet = Math.ceil(count / poets.length);
      const allPoems: any[] = [];

      for (const poet of poets) {
        try {
          const result = await this.searchByAuthor(poet, poemsPerPoet);
          const localFormat = result.poems.map(poem => this.convertToLocalFormat(poem));
          allPoems.push(...localFormat);
        } catch (error) {
          console.warn(`Failed to get poems for ${poet}:`, error);
        }
      }

      // Shuffle the results
      return allPoems.sort(() => Math.random() - 0.5).slice(0, count);
    } catch (error) {
      console.warn('Discovery poems failed, falling back to local:', error);
      return getRandomPoems(count);
    }
  }
}

export const poetryAPI = new PoetryAPIService();

// Start with random discovery - way better UX than starting from poem #1
export function createRandomSession(initialSize: number = 50): PoemSession {
  const poems = getRandomPoems(initialSize);
  return {
    poems,
    currentIndex: 0,
    hasMore: true
  };
}

// Add more random poems when running low
export function extendSession(session: PoemSession, batchSize: number = 20): PoemSession {
  const newPoems = getRandomPoems(batchSize);
  return {
    ...session,
    poems: [...session.poems, ...newPoems]
  };
}

// For users who want to browse sequentially
export function createSequentialSession(startIndex: number = 0, batchSize: number = 20): PoemSession {
  const poems = getPoemsPage(startIndex, batchSize);
  const total = getTotalPoemsCount();
  
  return {
    poems,
    currentIndex: 0,
    hasMore: poems.length + startIndex < total
  };
}

// Create hybrid session with both API and local poems
export async function createHybridSession(initialSize: number = 50): Promise<PoemSession> {
  const poems = await poetryAPI.getHybridRandomPoems(initialSize);
  return {
    poems,
    currentIndex: 0,
    hasMore: true
  };
}

export function createRandomWindow(): PoemWindow {
  const totalCount = getTotalPoemsCount();
  const randomStart = Math.floor(Math.random() * Math.max(1, totalCount - WINDOW_SIZE));
  const poems = getPoemsPage(randomStart, WINDOW_SIZE);
  
  return {
    poems,
    currentIndex: BUFFER_SIZE, // Start in middle of window
    globalIndex: randomStart + BUFFER_SIZE,
    totalCount,
    windowStart: randomStart
  };
}

export function slideWindow(window: PoemWindow, direction: 'next' | 'prev'): PoemWindow {
  const { currentIndex, globalIndex, totalCount, windowStart } = window;
  
  if (direction === 'next') {
    // If approaching end of window, slide forward
    if (currentIndex >= WINDOW_SIZE - BUFFER_SIZE - 1) {
      const newWindowStart = Math.min(
        totalCount - WINDOW_SIZE,
        windowStart + BUFFER_SIZE
      );
      const poems = getPoemsPage(newWindowStart, WINDOW_SIZE);
      
      return {
        poems,
        currentIndex: currentIndex - BUFFER_SIZE,
        globalIndex: globalIndex + 1,
        totalCount,
        windowStart: newWindowStart
      };
    }
    
    // Just move within current window
    return {
      ...window,
      currentIndex: Math.min(currentIndex + 1, WINDOW_SIZE - 1),
      globalIndex: Math.min(globalIndex + 1, totalCount - 1)
    };
  } else {
    // If approaching start of window, slide backward
    if (currentIndex <= BUFFER_SIZE) {
      const newWindowStart = Math.max(0, windowStart - BUFFER_SIZE);
      const poems = getPoemsPage(newWindowStart, WINDOW_SIZE);
      
      return {
        poems,
        currentIndex: currentIndex + BUFFER_SIZE,
        globalIndex: globalIndex - 1,
        totalCount,
        windowStart: newWindowStart
      };
    }
    
    // Just move within current window
    return {
      ...window,
      currentIndex: Math.max(currentIndex - 1, 0),
      globalIndex: Math.max(globalIndex - 1, 0)
    };
  }
} 