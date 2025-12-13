import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StoryNode } from './story-node.entity';

@Entity()
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  genre: string;

  @Column()
  protagonist: string;

  @Column({ default: false })
  matureEnabled: boolean;

  @OneToMany(() => StoryNode, (node) => node.story)
  nodes: StoryNode[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
