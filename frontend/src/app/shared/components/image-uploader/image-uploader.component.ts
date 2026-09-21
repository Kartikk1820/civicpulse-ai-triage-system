import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface PreviewFile {
  file: File;
  url: string;
}

@Component({
  selector: 'app-image-uploader',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './image-uploader.component.html',
  styleUrl: './image-uploader.component.scss',
})
export class ImageUploaderComponent {
  @Input() maxFiles = 3;
  @Output() filesChanged = new EventEmitter<File[]>();

  previews: PreviewFile[] = [];
  isDragOver = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
    input.value = '';
  }

  removeFile(index: number): void {
    URL.revokeObjectURL(this.previews[index].url);
    this.previews.splice(index, 1);
    this.emit();
  }

  private addFiles(files: File[]): void {
    const imagesOnly = files.filter((f) => f.type.startsWith('image/'));
    const room = this.maxFiles - this.previews.length;
    imagesOnly.slice(0, room).forEach((file) => {
      this.previews.push({ file, url: URL.createObjectURL(file) });
    });
    this.emit();
  }

  private emit(): void {
    this.filesChanged.emit(this.previews.map((p) => p.file));
  }
}
