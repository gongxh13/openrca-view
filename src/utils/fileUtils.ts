import { LoadedData } from '../types/data';
import { parseFileByType, detectDataType } from './csvParser';

export async function loadFile(file: File): Promise<LoadedData | null> {
  const dataType = detectDataType(file.name);
  if (!dataType) {
    console.warn('Unknown file type:', file.name);
    return null;
  }

  try {
    const data = await parseFileByType(file, dataType);
    console.log(`Parsed ${data.length} rows from ${file.name}`);
    
    if (data.length === 0) {
      console.warn(`Warning: No data parsed from ${file.name}`);
    } else {
      console.log('Sample data:', data[0]);
    }
    
    // 尝试从文件名中提取日期
    const dateMatch = file.name.match(/(\d{4}_\d{2}_\d{2})/);
    const date = dateMatch ? dateMatch[1] : undefined;

    return {
      type: dataType,
      date,
      data,
      fileName: file.name,
    };
  } catch (error) {
    console.error('Error loading file:', error);
    return null;
  }
}

export async function loadFolder(folder: FileSystemDirectoryHandle): Promise<LoadedData[]> {
  const loadedData: LoadedData[] = [];
  
  async function traverseDirectory(dir: FileSystemDirectoryHandle, path: string = '') {
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.csv')) {
        const file = await entry.getFile();
        const data = await loadFile(file);
        if (data) {
          loadedData.push(data);
        }
      } else if (entry.kind === 'directory') {
        await traverseDirectory(entry, `${path}/${entry.name}`);
      }
    }
  }

  await traverseDirectory(folder);
  return loadedData;
}

// 使用传统文件输入API的替代方案
export function selectFolder(): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      resolve(files);
    };
    input.click();
  });
}

export async function loadFilesFromFileList(files: FileList): Promise<LoadedData[]> {
  const loadedData: LoadedData[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.name.endsWith('.csv')) {
      const data = await loadFile(file);
      if (data) {
        loadedData.push(data);
      }
    }
  }
  
  return loadedData;
}

