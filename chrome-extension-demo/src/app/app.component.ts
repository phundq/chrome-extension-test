import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, filter, finalize, fromEvent, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewChecked, OnInit, OnDestroy {
  @ViewChild('chatOutput') chatOutput!: ElementRef;
  @ViewChild('textarea', { static: true }) textarea!: ElementRef;
  messages: { role: string, content: string }[] = [];
  isLoading = false;
  private readonly apiKey = ''; // Replace with your OpenAI API key

  private readonly ngUnsubscribe = new Subject<void>();
  constructor(private readonly http: HttpClient) { }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnInit() {
    console.log('AppComponent initialized');
    fromEvent(this.textarea.nativeElement, 'keyup')
      .pipe(
        takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.autoResize();
      });

    fromEvent(this.textarea.nativeElement, 'keyup')
      .pipe(
        filter((event: unknown) => (event as KeyboardEvent).key === 'Enter' && !(event as KeyboardEvent).shiftKey),
        debounceTime(300),
        takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.sendMessage();
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    console.log('AppComponent destroyed');
  }

  autoResize() {
    const textarea = this.textarea.nativeElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  sendMessage() {
    const userMessage = this.textarea.nativeElement.value.trim();
    if (!userMessage) return;

    this.messages.push({ role: 'user', content: userMessage });
    this.isLoading = true;
    this.textarea.nativeElement.value = '';
    this.autoResize(); // Reset textarea height

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });

    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: userMessage }],
      "max_tokens": 100
    };

    this.http.post('https://api.openai.com/v1/chat/completions', body, { headers })
      .pipe(
        finalize(() => this.isLoading = false),
      )
      .subscribe({
        next: (response: any) => {
          const aiMessage = response.choices[0].message.content;
          this.messages.push({ role: 'ai', content: aiMessage });
        },
        error: (error) => {
          console.error('Error:', error);
          this.messages.push({ role: 'ai', content: 'Error connecting to OpenAI API' });
        }
      });
  }

  scrollToBottom() {
    const element = this.chatOutput.nativeElement;
    element.scrollTop = element.scrollHeight;
  }
}
