export class SubmitTurnDto {
  action: 'DO' | 'SAY' | 'STORY' | 'SEE';
  text: string;
  rewindToken: number;
}
