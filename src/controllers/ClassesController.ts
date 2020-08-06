import {Request, Response} from 'express';
import db from '../database/connection';
import converteHoraParaMinutos from '../utils/converteHoraParaMinutos';

interface ScheduleItem {
    dia_da_semana: number,
    de: string,
    ate: string
};

export default class ClassesController {
    async index(request: Request, response: Response) {
        const filters = request.query;
        
        const dia_da_semana = filters.dia_da_semana as string;
        const assunto = filters.assunto as string;
        const hora = filters.hora as string;

        if(!dia_da_semana || !assunto || !hora) {
            return(response.status(400).json({
                error: 'Erro por falta de parâmetros de busca das classes'
            }));
        }

        const minutos = converteHoraParaMinutos(hora);

        const classes = await db('classes')
            .whereExists(function() {
                this.select('class_schedule.*')
                    .from('class_schedule')
                    .whereRaw('`class_schedule`.`class_id` = `classes`.`id`')
                    .whereRaw('`class_schedule`.`dia_da_semana` = ??', [Number(dia_da_semana)])
                    .whereRaw('`class_schedule`.`de` <= ??', [minutos])
                    .whereRaw('`class_schedule`.`ate` > ??', [minutos])
            })
            .where('classes.assunto', '=', assunto)
            .join('users', 'classes.user_id', '=', 'users.id')
            .select(['classes.*', 'users.*']);

        response.json(classes);
    }

    async create (request : Request, response : Response) {
        const {
            nome,
            avatar,
            whatsapp,
            bio,
            assunto,
            custo,
            schedule
        } = request.body;
    
        const trx = await db.transaction();
    
        try {
            const usuario_novo = await trx('users').insert({
                nome,
                avatar,
                whatsapp,
                bio,
            });
    
            const user_id = usuario_novo[0];
    
            const classe_nova = await trx('classes').insert({
                assunto,
                custo,
                user_id,
            });
    
            const class_id = classe_nova[0];
    
            const classSchedule = schedule.map((sch : ScheduleItem) => {
                return({
                    dia_da_semana: sch.dia_da_semana,
                    de: converteHoraParaMinutos(sch.de),
                    ate: converteHoraParaMinutos(sch.ate),
                    class_id
                });
            });
    
            await trx('class_schedule').insert(classSchedule);
    
            await trx.commit();
            return(response.status(201).send());
        } catch(erro) {
            await trx.rollback();
    
            return response.status(400).json({
                error: 'Erro inesperado ao criar uma classe'
            })
        }
    }
};