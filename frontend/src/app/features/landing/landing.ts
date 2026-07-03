import { NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HealthService } from '../../core/services/health.service';

@Component({
  selector: 'app-landing',
  imports: [NgClass, RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private readonly healthService = inject(HealthService);

  readonly backendStatus = signal<'online' | 'offline' | null>(null);

  readonly features = [
    {
      marker: 'B',
      title: 'Boardovi i liste',
      text: 'Razdvoji posao po workspace-ovima, boardovima i listama koje tim lako prati.',
      tone: 'bg-sky-100 text-sky-700',
    },
    {
      marker: 'A',
      title: 'Dodela taskova clanovima',
      text: 'Dodaj odgovorne osobe na kartice i odmah vidi ko nosi sledeci korak.',
      tone: 'bg-emerald-100 text-emerald-700',
    },
    {
      marker: 'I',
      title: 'Pozivnice za tim',
      text: 'Pozovi saradnike na board i zadrzi kontrolu nad ulogama i pristupom.',
      tone: 'bg-violet-100 text-violet-700',
    },
    {
      marker: 'N',
      title: 'Notifikacije u aplikaciji',
      text: 'Korisnici dobijaju bitne promene kroz jasan notification centar.',
      tone: 'bg-amber-100 text-amber-700',
    },
    {
      marker: 'P',
      title: 'Responsive iskustvo',
      text: 'TaskFlow je prilagodjen radu na telefonu, tabletu i desktopu.',
      tone: 'bg-rose-100 text-rose-700',
    },
    {
      marker: 'R',
      title: 'Brz responsive UI',
      text: 'Interfejs ostaje pregledan kada radis samostalno ili sa vecim timom.',
      tone: 'bg-cyan-100 text-cyan-700',
    },
  ];

  readonly steps = [
    {
      step: '01',
      title: 'Kreiraj workspace',
      text: 'Postavi prostor za projekat, proizvod ili timsku inicijativu.',
    },
    {
      step: '02',
      title: 'Pozovi clanove',
      text: 'Dodaj saradnike i odredi ko moze da uredjuje board.',
    },
    {
      step: '03',
      title: 'Organizuj taskove',
      text: 'Kreiraj kartice, dodeli ljude i pomeraj posao kroz tok rada.',
    },
  ];

  constructor() {
    void this.checkBackendHealth();
  }

  private async checkBackendHealth(): Promise<void> {
    const isOnline = await this.healthService.checkHealth();
    this.backendStatus.set(isOnline ? 'online' : 'offline');
  }
}
