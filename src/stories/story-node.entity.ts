import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Story } from './story.entity';

@Entity()
export class StoryNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Story, (story) => story.nodes, {
    onDelete: 'CASCADE',
  })
  story: Story;

  @Column({ nullable: true })
  parentNodeId: string;

  @Column()
  actionType: string;

  @Column('text')
  userInput: string;

  @Column('text')
  generatedText: string;

  @Column()
  tokenStart: number;

  @Column()
  tokenEnd: number;

  @CreateDateColumn()
  createdAt: Date;
}
